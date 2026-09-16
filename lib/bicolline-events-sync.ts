import "server-only";
import { isSyncDue } from "@/lib/app-settings";
import {
  dedupeByExternalId,
  decodeHtmlEntities,
  fetchAllPages,
  loginToBicollineAdmin,
} from "@/lib/bicolline-client";
import { createAdminClient } from "@/lib/supabase-admin";

const EVENT_SYNC_FREQUENCY_KEY = "event_sync_frequency";
const EVENT_LAST_SYNCED_KEY = "event_sync_last_synced_at";

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
};

// "28 novembre 2026" or "23 novembre 2026 14:00" -> ISO string.
export function parseFrenchDate(text: string): string | null {
  const trimmed = decodeHtmlEntities(text).trim();
  const match = trimmed.match(
    /^(\d{1,2})\s+(\S+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/,
  );
  if (!match) return null;
  const month = FRENCH_MONTHS[match[2].toLowerCase()];
  if (!month) return null;
  const day = parseInt(match[1], 10);
  const year = parseInt(match[3], 10);
  const hour = match[4] ? parseInt(match[4], 10) : 0;
  const minute = match[5] ? parseInt(match[5], 10) : 0;
  return new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
}

type ScrapedEvent = {
  external_id: number;
  name: string;
  category: string | null;
  start_date: string | null;
  registration_start_date: string | null;
  registration_end_date: string | null;
};

const EVENT_ROW_PATTERN =
  /<tr><th class="field-name"><a href="\/admin\/siteWeb\/event\/(\d+)\/change\/[^"]*">([^<]+)<\/a><\/th><td class="field-category nowrap">([^<]*)<\/td><td class="field-start_date nowrap">([^<]*)<\/td><td class="field-registration_start_date nowrap">([^<]*)<\/td><td class="field-registration_end_date nowrap">([^<]*)<\/td><\/tr>/g;

function parseEventsFromHtml(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  for (const match of html.matchAll(EVENT_ROW_PATTERN)) {
    events.push({
      external_id: parseInt(match[1], 10),
      name: decodeHtmlEntities(match[2]),
      category: decodeHtmlEntities(match[3]).trim() || null,
      start_date: parseFrenchDate(match[4]),
      registration_start_date: parseFrenchDate(match[5]),
      registration_end_date: parseFrenchDate(match[6]),
    });
  }
  return events;
}

type ScrapedEventOption = {
  external_id: number;
  event_date: string;
  event_name: string;
  guild_name: string;
  admission_limit: number | null;
  vip_limit: number | null;
  vip_for_cessionaries: boolean;
  vip_for_members: boolean;
  is_active: boolean;
};

const EVENT_OPTION_ROW_PATTERN =
  /<tr><th class="field-event nowrap"><a href="\/admin\/siteWeb\/eventoption\/(\d+)\/change\/[^"]*">(\d{4}-\d{2}-\d{2}): ([^<]*)<\/a><\/th><td class="field-name">([^<]*)<\/td><td class="field-limit">(\d*)<\/td><td class="field-vip_limit">(\d*)<\/td><td class="field-vip_for_cessionaries"><img[^>]*alt="(True|False)"><\/td><td class="field-vip_for_members"><img[^>]*alt="(True|False)"><\/td><td class="field-is_active"><img[^>]*alt="(True|False)"><\/td><\/tr>/g;

function parseEventOptionsFromHtml(html: string): ScrapedEventOption[] {
  const options: ScrapedEventOption[] = [];
  for (const match of html.matchAll(EVENT_OPTION_ROW_PATTERN)) {
    options.push({
      external_id: parseInt(match[1], 10),
      event_date: match[2],
      event_name: decodeHtmlEntities(match[3]),
      guild_name: decodeHtmlEntities(match[4]),
      admission_limit: match[5] ? parseInt(match[5], 10) : null,
      vip_limit: match[6] ? parseInt(match[6], 10) : null,
      vip_for_cessionaries: match[7] === "True",
      vip_for_members: match[8] === "True",
      is_active: match[9] === "True",
    });
  }
  return options;
}

export async function syncEvents(options?: { force?: boolean }): Promise<{
  skipped: boolean;
  eventsSynced: number;
  optionsSynced: number;
  optionsSkipped: number;
}> {
  const email = process.env.BICOLLINE_ADMIN_EMAIL;
  const password = process.env.BICOLLINE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "BICOLLINE_ADMIN_EMAIL / BICOLLINE_ADMIN_PASSWORD ne sont pas configurés.",
    );
  }

  const admin = createAdminClient();

  if (!options?.force) {
    const { data: settingsRows } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", [EVENT_SYNC_FREQUENCY_KEY, EVENT_LAST_SYNCED_KEY]);
    const frequency =
      settingsRows?.find((r) => r.key === EVENT_SYNC_FREQUENCY_KEY)?.value ??
      "weekly";
    const lastSyncedAt = settingsRows?.find(
      (r) => r.key === EVENT_LAST_SYNCED_KEY,
    )?.value;
    if (!isSyncDue(lastSyncedAt, frequency)) {
      return {
        skipped: true,
        eventsSynced: 0,
        optionsSynced: 0,
        optionsSkipped: 0,
      };
    }
  }

  const jar = await loginToBicollineAdmin(email, password);

  const scrapedEvents = await fetchAllPages(
    jar,
    "/admin/siteWeb/event/",
    parseEventsFromHtml,
  );
  if (scrapedEvents.length === 0) {
    throw new Error(
      "Aucun évènement trouvé — la structure de la page a peut-être changé.",
    );
  }
  const events = dedupeByExternalId(scrapedEvents);

  const { error: eventsError } = await admin.from("bicolline_events").upsert(
    events.map((e) => ({ ...e, synced_at: new Date().toISOString() })),
    { onConflict: "external_id" },
  );
  if (eventsError) throw eventsError;

  const eventIdByName = new Map(events.map((e) => [e.name, e.external_id]));

  const scrapedOptions = await fetchAllPages(
    jar,
    "/admin/siteWeb/eventoption/",
    parseEventOptionsFromHtml,
  );
  const optionsDeduped = dedupeByExternalId(scrapedOptions);

  const optionRows: {
    external_id: number;
    event_external_id: number;
    event_label: string;
    guild_name: string;
    admission_limit: number | null;
    vip_limit: number | null;
    vip_for_cessionaries: boolean;
    vip_for_members: boolean;
    is_active: boolean;
    synced_at: string;
  }[] = [];
  let optionsSkipped = 0;

  for (const opt of optionsDeduped) {
    const eventId = eventIdByName.get(opt.event_name);
    if (eventId === undefined) {
      optionsSkipped += 1;
      continue;
    }
    optionRows.push({
      external_id: opt.external_id,
      event_external_id: eventId,
      event_label: `${opt.event_date}: ${opt.event_name}`,
      guild_name: opt.guild_name,
      admission_limit: opt.admission_limit,
      vip_limit: opt.vip_limit,
      vip_for_cessionaries: opt.vip_for_cessionaries,
      vip_for_members: opt.vip_for_members,
      is_active: opt.is_active,
      synced_at: new Date().toISOString(),
    });
  }

  if (optionRows.length > 0) {
    const { error: optionsError } = await admin
      .from("bicolline_event_options")
      .upsert(optionRows, { onConflict: "external_id" });
    if (optionsError) throw optionsError;
  }

  await admin.from("app_settings").upsert({
    key: EVENT_LAST_SYNCED_KEY,
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return {
    skipped: false,
    eventsSynced: events.length,
    optionsSynced: optionRows.length,
    optionsSkipped,
  };
}
