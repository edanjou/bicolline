import "server-only";
import { isSyncDue } from "@/lib/app-settings";
import {
  BICOLLINE_BASE_URL,
  cookieHeader,
  decodeHtmlEntities,
  loginToBicollineAdmin,
  type CookieJar,
} from "@/lib/bicolline-client";
import { createAdminClient } from "@/lib/supabase-admin";

const REGISTRATION_CURSOR_KEY = "event_registration_sync_cursor";
const REGISTRATION_LAST_SYNCED_KEY = "event_registration_sync_last_synced_at";
const REGISTRATION_SYNC_FREQUENCY_KEY = "event_registration_sync_frequency";
const TIME_BUDGET_MS = 250_000;

// Only registrations for events starting this year or later are synced —
// the full history runs to 17k+ rows of personal data (name/email), most
// of it for events long past.
const MIN_EVENT_YEAR = 2026;

type ScrapedRegistration = {
  external_id: number;
  first_name: string | null;
  last_name: string | null;
  admission_name: string | null;
  have_options: string | null;
  is_member_when_registered: boolean;
  is_additional_participant: boolean;
  is_present: boolean;
  has_unpaid_balance: boolean;
  user_name: string | null;
  user_email: string | null;
};

// have_options isn't always plain text — when the registrant picked meal/
// logistics options it renders as a nested "<ul><li>...</li></ul>" list,
// so that group can't be [^<]* like the others.
const REGISTRATION_ROW_PATTERN =
  /<tr><th class="field-first_name"><a href="\/admin\/siteWeb\/registration\/(\d+)\/change\/[^"]*">([^<]*)<\/a><\/th><td class="field-last_name">([^<]*)<\/td><td class="field-admission_name">([^<]*)<\/td><td class="field-have_options">([\s\S]*?)<\/td><td class="field-is_member_when_registered"><img[^>]*alt="(True|False)"><\/td><td class="field-is_additional_participant"><img[^>]*alt="(True|False)"><\/td><td class="field-action_is_present">([\s\S]*?)<\/td><td class="field-event_name">[^<]*<\/td><td class="field-user nowrap">([^<]*)<\/td><\/tr>/g;

function extractHaveOptionsText(raw: string): string | null {
  const items = [...raw.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) =>
    decodeHtmlEntities(m[1].replace(/<[^>]*>/g, "")).trim(),
  );
  if (items.length > 0) return items.filter(Boolean).join(", ") || null;
  return decodeHtmlEntities(raw.replace(/<[^>]*>/g, "")).trim() || null;
}

function parseUserCell(text: string): {
  name: string | null;
  email: string | null;
} {
  const decoded = decodeHtmlEntities(text);
  const match = decoded.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!match) return { name: decoded.trim() || null, email: null };
  return { name: match[1].trim() || null, email: match[2].trim() || null };
}

const REGISTRATION_PAGE_SIZE = 10;

// Django admin silently drops the "Événement" filter and falls back to the
// full unfiltered list (appending "?e=1" to the URL) once the requested
// page exceeds the filtered result's page count — it does NOT return an
// empty page. Relying on "0 rows = end of event" therefore never
// terminates and mislabels other events' registrations. Bounding by the
// real count shown on page 1 avoids ever requesting an out-of-range page.
function extractRegistrationCount(html: string): number | null {
  const match = html.match(/(\d+)\s+Inscriptions?\s*</);
  return match ? parseInt(match[1], 10) : null;
}

function parseRegistrationsFromHtml(html: string): ScrapedRegistration[] {
  const rows: ScrapedRegistration[] = [];
  for (const match of html.matchAll(REGISTRATION_ROW_PATTERN)) {
    const { name, email } = parseUserCell(match[9]);
    rows.push({
      external_id: parseInt(match[1], 10),
      first_name: decodeHtmlEntities(match[2]).trim() || null,
      last_name: decodeHtmlEntities(match[3]).trim() || null,
      admission_name: decodeHtmlEntities(match[4]).trim() || null,
      have_options: extractHaveOptionsText(match[5]),
      is_member_when_registered: match[6] === "True",
      is_additional_participant: match[7] === "True",
      is_present: match[8].includes("Enregistré"),
      has_unpaid_balance: match[8].includes("Solde impayé"),
      user_name: name,
      user_email: email,
    });
  }
  return rows;
}

type SyncCursor = { eventIndex: number; page: number; maxPages?: number };

function parseCursor(value: string | null | undefined): SyncCursor {
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (
        typeof parsed.eventIndex === "number" &&
        typeof parsed.page === "number"
      ) {
        return parsed;
      }
    } catch {
      // fall through to fresh cursor
    }
  }
  return { eventIndex: 0, page: 1 };
}

export async function syncEventRegistrations(options?: {
  force?: boolean;
}): Promise<{
  skipped: boolean;
  done: boolean;
  pagesProcessed: number;
  registrationsSynced: number;
}> {
  const email = process.env.BICOLLINE_ADMIN_EMAIL;
  const password = process.env.BICOLLINE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "BICOLLINE_ADMIN_EMAIL / BICOLLINE_ADMIN_PASSWORD ne sont pas configurés.",
    );
  }

  const admin = createAdminClient();
  const startedAt = Date.now();

  const { data: settingsRows } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", [
      REGISTRATION_CURSOR_KEY,
      REGISTRATION_SYNC_FREQUENCY_KEY,
      REGISTRATION_LAST_SYNCED_KEY,
    ]);
  const cursor = parseCursor(
    settingsRows?.find((r) => r.key === REGISTRATION_CURSOR_KEY)?.value,
  );

  if (cursor.eventIndex === 0 && cursor.page === 1 && !options?.force) {
    const frequency =
      settingsRows?.find((r) => r.key === REGISTRATION_SYNC_FREQUENCY_KEY)
        ?.value ?? "weekly";
    const lastSyncedAt = settingsRows?.find(
      (r) => r.key === REGISTRATION_LAST_SYNCED_KEY,
    )?.value;
    if (!isSyncDue(lastSyncedAt, frequency)) {
      return {
        skipped: true,
        done: true,
        pagesProcessed: 0,
        registrationsSynced: 0,
      };
    }
  }

  const { data: eventRows, error: eventsError } = await admin
    .from("bicolline_events")
    .select("external_id, name")
    .gte("start_date", `${MIN_EVENT_YEAR}-01-01`)
    .order("external_id", { ascending: true });
  if (eventsError) throw eventsError;

  const eventIds = (eventRows ?? []).map((r) => r.external_id as number);
  const eventNameById = new Map(
    (eventRows ?? []).map((r) => [r.external_id as number, r.name as string]),
  );

  if (eventIds.length === 0) {
    throw new Error(
      `Aucun évènement ${MIN_EVENT_YEAR}+ trouvé — synchronisez d'abord les évènements.`,
    );
  }

  // A fresh session per event — Django admin's changelist "preserved
  // filters" appear to leak across requests within one session once a
  // filtered page goes out of range (see the "e=1" fallback below),
  // which was silently corrupting later events sharing the same cookie
  // jar. Isolating each event in its own login sidesteps that entirely.
  let jar: CookieJar = await loginToBicollineAdmin(email, password);

  let { eventIndex, page, maxPages } = cursor;
  let pagesProcessed = 0;
  let registrationsSynced = 0;
  let done = false;

  const saveCursor = () =>
    admin.from("app_settings").upsert({
      key: REGISTRATION_CURSOR_KEY,
      value: JSON.stringify({ eventIndex, page, maxPages }),
      updated_at: new Date().toISOString(),
    });

  const advanceToNextEvent = async () => {
    eventIndex += 1;
    page = 1;
    maxPages = undefined;
    await saveCursor();
    if (eventIndex < eventIds.length) {
      jar = await loginToBicollineAdmin(email, password);
    }
  };

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    if (eventIndex >= eventIds.length) {
      done = true;
      break;
    }

    const eventId = eventIds[eventIndex];
    const url = `${BICOLLINE_BASE_URL}/admin/siteWeb/registration/?${encodeURIComponent(
      "Événement",
    )}=${eventId}&p=${page}`;
    const res = await fetch(url, { headers: { cookie: cookieHeader(jar) } });
    if (!res.ok) {
      await advanceToNextEvent();
      continue;
    }

    // Django dropped our filter (out-of-range page, bad params, ...) and
    // fell back to the unfiltered changelist — never trust this response.
    if (res.url.includes("e=1")) {
      await advanceToNextEvent();
      continue;
    }

    const html = await res.text();

    if (maxPages === undefined) {
      const count = extractRegistrationCount(html);
      maxPages =
        count === null || count === 0
          ? 0
          : Math.ceil(count / REGISTRATION_PAGE_SIZE);
      await saveCursor();
    }

    if (maxPages === 0 || page > maxPages) {
      await advanceToNextEvent();
      continue;
    }

    const pageRows = parseRegistrationsFromHtml(html);
    if (pageRows.length === 0) {
      await advanceToNextEvent();
      continue;
    }

    const { error } = await admin
      .from("bicolline_event_registrations")
      .upsert(
        pageRows.map((r) => ({
          ...r,
          event_external_id: eventId,
          event_name: eventNameById.get(eventId) ?? "",
          synced_at: new Date().toISOString(),
        })),
        { onConflict: "external_id" },
      );
    if (error) throw error;

    registrationsSynced += pageRows.length;
    pagesProcessed += 1;
    page += 1;
    await saveCursor();
  }

  if (done) {
    await admin.from("app_settings").upsert([
      {
        key: REGISTRATION_CURSOR_KEY,
        value: JSON.stringify({ eventIndex: 0, page: 1 }),
        updated_at: new Date().toISOString(),
      },
      {
        key: REGISTRATION_LAST_SYNCED_KEY,
        value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  return { skipped: false, done, pagesProcessed, registrationsSynced };
}

// On-demand sync for a single event, triggered from the Inscriptions page
// — no cursor/time-budget bookkeeping needed since one event is small
// enough (at most a few hundred pages) to finish within one request.
export async function syncSingleEventRegistrations(
  eventExternalId: number,
): Promise<{ registrationsSynced: number }> {
  const email = process.env.BICOLLINE_ADMIN_EMAIL;
  const password = process.env.BICOLLINE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "BICOLLINE_ADMIN_EMAIL / BICOLLINE_ADMIN_PASSWORD ne sont pas configurés.",
    );
  }

  const admin = createAdminClient();

  const { data: eventRow, error: eventError } = await admin
    .from("bicolline_events")
    .select("external_id, name")
    .eq("external_id", eventExternalId)
    .maybeSingle();
  if (eventError) throw eventError;
  if (!eventRow) {
    throw new Error(
      "Évènement introuvable — synchronisez d'abord les évènements.",
    );
  }

  const jar: CookieJar = await loginToBicollineAdmin(email, password);

  let registrationsSynced = 0;
  let maxPages: number | undefined;
  let page = 1;

  for (;;) {
    const url = `${BICOLLINE_BASE_URL}/admin/siteWeb/registration/?${encodeURIComponent(
      "Événement",
    )}=${eventExternalId}&p=${page}`;
    const res = await fetch(url, { headers: { cookie: cookieHeader(jar) } });
    if (!res.ok || res.url.includes("e=1")) break;

    const html = await res.text();

    if (maxPages === undefined) {
      const count = extractRegistrationCount(html);
      maxPages =
        count === null || count === 0
          ? 0
          : Math.ceil(count / REGISTRATION_PAGE_SIZE);
    }
    if (maxPages === 0 || page > maxPages) break;

    const pageRows = parseRegistrationsFromHtml(html);
    if (pageRows.length === 0) break;

    const { error } = await admin.from("bicolline_event_registrations").upsert(
      pageRows.map((r) => ({
        ...r,
        event_external_id: eventExternalId,
        event_name: eventRow.name,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: "external_id" },
    );
    if (error) throw error;

    registrationsSynced += pageRows.length;
    page += 1;
  }

  return { registrationsSynced };
}
