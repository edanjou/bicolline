import { supabase } from "@/lib/supabase";

// The Supabase project caps a single response at 1000 rows regardless of
// the requested limit, so any table that can exceed that (an event can
// have 2000+ registrations) needs to be paged through explicitly.
async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const pageSize = 1000;
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export type BicollineEvent = {
  external_id: number;
  name: string;
  category: string | null;
  start_date: string | null;
  registration_start_date: string | null;
  registration_end_date: string | null;
  synced_at: string;
};

export async function listBicollineEvents(): Promise<BicollineEvent[]> {
  return fetchAllRows((from, to) =>
    supabase
      .from("bicolline_events")
      .select("*")
      .order("start_date", { ascending: false })
      .range(from, to),
  );
}

export type BicollineEventOption = {
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
};

export async function listBicollineEventOptions(
  eventExternalId: number,
): Promise<BicollineEventOption[]> {
  return fetchAllRows((from, to) =>
    supabase
      .from("bicolline_event_options")
      .select("*")
      .eq("event_external_id", eventExternalId)
      .order("guild_name", { ascending: true })
      .range(from, to),
  );
}

export type BicollineEventRegistration = {
  external_id: number;
  event_external_id: number;
  event_name: string;
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
  synced_at: string;
};

export async function listBicollineEventRegistrations(
  eventExternalId: number,
): Promise<BicollineEventRegistration[]> {
  return fetchAllRows((from, to) =>
    supabase
      .from("bicolline_event_registrations")
      .select("*")
      .eq("event_external_id", eventExternalId)
      .order("last_name", { ascending: true })
      .range(from, to),
  );
}

export type MealSummary = {
  dinerRegulier: number;
  dinerVegetarien: number;
  souperRegulier: number;
  souperVegetarien: number;
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function parseMealItem(
  item: string,
): { diner: boolean; souper: boolean; vegetarien: boolean } | null {
  const normalized = stripAccents(item).toLowerCase();
  if (normalized.includes("aucun")) return null;
  const diner = normalized.includes("diner");
  const souper = normalized.includes("souper");
  if (!diner && !souper) return null;
  return { diner, souper, vegetarien: normalized.includes("vegetarien") };
}

// have_options is a free-text, comma-joined list scraped from the source
// site (e.g. "Dîner + Souper (Régulier), Aucun repas" for a registration
// covering two people) — one item per meal pick, tallied per event so
// catering knows how many of each to prepare.
export function summarizeEventMeals(
  registrations: { have_options: string | null }[],
): MealSummary {
  const summary: MealSummary = {
    dinerRegulier: 0,
    dinerVegetarien: 0,
    souperRegulier: 0,
    souperVegetarien: 0,
  };
  for (const registration of registrations) {
    if (!registration.have_options) continue;
    for (const rawItem of registration.have_options.split(",")) {
      const parsed = parseMealItem(rawItem.trim());
      if (!parsed) continue;
      if (parsed.diner) {
        if (parsed.vegetarien) summary.dinerVegetarien += 1;
        else summary.dinerRegulier += 1;
      }
      if (parsed.souper) {
        if (parsed.vegetarien) summary.souperVegetarien += 1;
        else summary.souperRegulier += 1;
      }
    }
  }
  return summary;
}
