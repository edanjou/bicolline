import { supabase } from "@/lib/supabase";

export type WarningSeverity = "avertissement" | "expulsion";

export type CombatWarning = {
  id: string;
  character_id: number;
  character_name: string;
  player_name: string | null;
  reason: string;
  severity: WarningSeverity;
  issued_by: string;
  year: number;
  activity_date: string | null;
  created_at: string;
};

type RawCharacterJoin = {
  name: string;
  player_name: string | null;
} | null;

type RawWarning = {
  id: string;
  character_id: number;
  reason: string;
  severity: WarningSeverity;
  issued_by: string;
  year: number;
  activity_date: string | null;
  created_at: string;
  characters: RawCharacterJoin | RawCharacterJoin[];
};

const WARNING_SELECT =
  "id, character_id, reason, severity, issued_by, year, activity_date, created_at, characters(name, player_name)";

function normalize(row: RawWarning): CombatWarning {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  return {
    id: row.id,
    character_id: row.character_id,
    character_name: character?.name ?? "",
    player_name: character?.player_name ?? null,
    reason: row.reason,
    severity: row.severity,
    issued_by: row.issued_by,
    year: row.year,
    activity_date: row.activity_date,
    created_at: row.created_at,
  };
}

export async function listWarnings(): Promise<CombatWarning[]> {
  const { data, error } = await supabase
    .from("comite_combat_warnings")
    .select(WARNING_SELECT)
    .order("year", { ascending: false })
    .order("activity_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalize(row as RawWarning));
}

export async function createWarning(
  characterId: number,
): Promise<CombatWarning> {
  const { data, error } = await supabase
    .from("comite_combat_warnings")
    .insert({
      character_id: characterId,
      reason: "",
      severity: "avertissement",
      issued_by: "",
      year: new Date().getFullYear(),
      activity_date: null,
    })
    .select(WARNING_SELECT)
    .single();
  if (error) throw error;
  return normalize(data as RawWarning);
}

export async function updateWarning(
  id: string,
  fields: Partial<{
    reason: string;
    severity: WarningSeverity;
    issued_by: string;
    year: number;
    activity_date: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from("comite_combat_warnings")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteWarning(id: string): Promise<void> {
  const { error } = await supabase
    .from("comite_combat_warnings")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
