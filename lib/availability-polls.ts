import { supabase } from "@/lib/supabase";

export type AvailabilityAnswer = "yes" | "maybe" | "no";

export const AVAILABILITY_ANSWERS: {
  value: AvailabilityAnswer;
  label: string;
}[] = [
  { value: "yes", label: "Oui" },
  { value: "maybe", label: "Si nécessaire" },
  { value: "no", label: "Non" },
];

export type AvailabilityPoll = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  is_open: boolean;
  created_at: string;
};

export type AvailabilitySlot = {
  id: string;
  poll_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  position: number;
};

export type AvailabilityResponse = {
  id: string;
  poll_id: string;
  name: string;
  email: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
  answers: Record<string, AvailabilityAnswer>;
};

export type AvailabilityPollSummary = AvailabilityPoll & {
  slot_count: number;
  response_count: number;
};

export type SlotDraft = {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
};

export type PollInput = {
  title: string;
  description: string | null;
  location: string | null;
};

export function formatSlotDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatSlotTime(slot: {
  start_time: string | null;
  end_time: string | null;
}): string {
  const start = slot.start_time?.slice(0, 5) ?? "";
  const end = slot.end_time?.slice(0, 5) ?? "";
  if (start && end) return `${start}–${end}`;
  return start || "Toute la journée";
}

export function sortSlots<T extends AvailabilitySlot | SlotDraft>(
  slots: T[],
): T[] {
  return [...slots].sort((a, b) =>
    a.date !== b.date
      ? a.date.localeCompare(b.date)
      : (a.start_time ?? "").localeCompare(b.start_time ?? ""),
  );
}

export async function listPolls(): Promise<AvailabilityPollSummary[]> {
  const { data, error } = await supabase
    .from("availability_polls")
    .select(
      "*, availability_poll_slots(count), availability_poll_responses(count)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(
    ({
      availability_poll_slots,
      availability_poll_responses,
      ...poll
    }: AvailabilityPoll & {
      availability_poll_slots: { count: number }[];
      availability_poll_responses: { count: number }[];
    }) => ({
      ...poll,
      slot_count: availability_poll_slots[0]?.count ?? 0,
      response_count: availability_poll_responses[0]?.count ?? 0,
    }),
  );
}

export async function getPollDetails(pollId: string): Promise<{
  poll: AvailabilityPoll;
  slots: AvailabilitySlot[];
  responses: AvailabilityResponse[];
}> {
  const [pollRes, slotsRes, responsesRes] = await Promise.all([
    supabase.from("availability_polls").select("*").eq("id", pollId).single(),
    supabase.from("availability_poll_slots").select("*").eq("poll_id", pollId),
    supabase
      .from("availability_poll_responses")
      .select("*, availability_poll_answers(slot_id, answer)")
      .eq("poll_id", pollId)
      .order("created_at", { ascending: true }),
  ]);
  if (pollRes.error) throw pollRes.error;
  if (slotsRes.error) throw slotsRes.error;
  if (responsesRes.error) throw responsesRes.error;

  return {
    poll: pollRes.data,
    slots: sortSlots(slotsRes.data ?? []),
    responses: (responsesRes.data ?? []).map(
      ({
        availability_poll_answers,
        ...response
      }: Omit<AvailabilityResponse, "answers"> & {
        availability_poll_answers: {
          slot_id: string;
          answer: AvailabilityAnswer;
        }[];
      }) => ({
        ...response,
        answers: Object.fromEntries(
          availability_poll_answers.map((a) => [a.slot_id, a.answer]),
        ),
      }),
    ),
  };
}

// Les plages existantes gardent leur id (et donc leurs réponses) ; une plage
// retirée du formulaire est supprimée avec ses réponses.
async function syncSlots(pollId: string, slots: SlotDraft[]): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("availability_poll_slots")
    .select("id")
    .eq("poll_id", pollId);
  if (existingError) throw existingError;

  const keptIds = new Set(slots.map((s) => s.id).filter(Boolean));
  const removedIds = (existing ?? [])
    .map((s) => s.id)
    .filter((id) => !keptIds.has(id));
  if (removedIds.length > 0) {
    const { error } = await supabase
      .from("availability_poll_slots")
      .delete()
      .in("id", removedIds);
    if (error) throw error;
  }

  const rows = sortSlots(slots).map((s, position) => ({
    ...(s.id ? { id: s.id } : {}),
    poll_id: pollId,
    date: s.date,
    start_time: s.start_time || null,
    end_time: s.end_time || null,
    position,
  }));
  const updates = rows.filter((r) => "id" in r);
  const inserts = rows.filter((r) => !("id" in r));
  if (updates.length > 0) {
    const { error } = await supabase
      .from("availability_poll_slots")
      .upsert(updates);
    if (error) throw error;
  }
  if (inserts.length > 0) {
    const { error } = await supabase
      .from("availability_poll_slots")
      .insert(inserts);
    if (error) throw error;
  }
}

export async function createPoll(
  input: PollInput,
  slots: SlotDraft[],
): Promise<string> {
  const { data, error } = await supabase
    .from("availability_polls")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  await syncSlots(data.id, slots);
  return data.id;
}

export async function updatePoll(
  pollId: string,
  input: PollInput,
  slots: SlotDraft[],
): Promise<void> {
  const { error } = await supabase
    .from("availability_polls")
    .update(input)
    .eq("id", pollId);
  if (error) throw error;
  await syncSlots(pollId, slots);
}

export async function setPollOpen(
  pollId: string,
  isOpen: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("availability_polls")
    .update({ is_open: isOpen })
    .eq("id", pollId);
  if (error) throw error;
}

export async function deletePoll(pollId: string): Promise<void> {
  const { error } = await supabase
    .from("availability_polls")
    .delete()
    .eq("id", pollId);
  if (error) throw error;
}

export async function deleteResponse(responseId: string): Promise<void> {
  const { error } = await supabase
    .from("availability_poll_responses")
    .delete()
    .eq("id", responseId);
  if (error) throw error;
}
