import { supabase } from "@/lib/supabase";

export type CalendarEntryType =
  "Duché" | "Livrables" | "Publications" | "Rencontres";

export const CALENDAR_ENTRY_TYPES: CalendarEntryType[] = [
  "Duché",
  "Livrables",
  "Publications",
  "Rencontres",
];

export type CalendarEntry = {
  id: string;
  coordination_key: string;
  title: string;
  start_date: string;
  end_date: string;
  type: CalendarEntryType;
  location: string;
  description: string;
};

const CALENDAR_ENTRY_SELECT =
  "id, coordination_key, title, start_date, end_date, type, location, description";

export async function listCalendarEntries(
  coordinationKey: string,
  year: number,
): Promise<CalendarEntry[]> {
  const { data, error } = await supabase
    .from("calendar_entries")
    .select(CALENDAR_ENTRY_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type CalendarEntryInput = {
  title: string;
  start_date: string;
  end_date: string;
  type: CalendarEntryType;
  location: string;
  description: string;
};

export async function createCalendarEntry(
  coordinationKey: string,
  year: number,
  input: CalendarEntryInput,
): Promise<CalendarEntry> {
  const { data, error } = await supabase
    .from("calendar_entries")
    .insert({ coordination_key: coordinationKey, year, ...input })
    .select(CALENDAR_ENTRY_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCalendarEntry(
  id: string,
  input: CalendarEntryInput,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_entries")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCalendarEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("calendar_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
