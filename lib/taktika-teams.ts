import { supabase } from "@/lib/supabase";

export type TaktikaTeam = {
  id: string;
  name: string;
  created_at: string;
};

export type TaktikaTeamMember = {
  id: string;
  team_id: string;
  character_id: number;
  role: string | null;
  created_at: string;
  name: string;
  player_name: string | null;
  player_email: string | null;
};

type RawCharacterJoin = {
  name: string;
  player_name: string | null;
  player_email: string | null;
} | null;

type RawTeamMember = {
  id: string;
  team_id: string;
  character_id: number;
  role: string | null;
  created_at: string;
  characters: RawCharacterJoin | RawCharacterJoin[];
};

function normalizeMember(row: RawTeamMember): TaktikaTeamMember {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  return {
    id: row.id,
    team_id: row.team_id,
    character_id: row.character_id,
    role: row.role,
    created_at: row.created_at,
    name: character?.name ?? "",
    player_name: character?.player_name ?? null,
    player_email: character?.player_email ?? null,
  };
}

const MEMBER_SELECT =
  "id, team_id, character_id, role, created_at, characters(name, player_name, player_email)";

export async function listTeams(): Promise<TaktikaTeam[]> {
  const { data, error } = await supabase
    .from("taktika_teams")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTeam(name: string): Promise<TaktikaTeam> {
  const { data, error } = await supabase
    .from("taktika_teams")
    .insert({ name })
    .select("id, name, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function renameTeam(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("taktika_teams")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase.from("taktika_teams").delete().eq("id", id);
  if (error) throw error;
}

export async function listTeamMembers(
  teamId: string,
): Promise<TaktikaTeamMember[]> {
  const { data, error } = await supabase
    .from("taktika_team_members")
    .select(MEMBER_SELECT)
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeMember(row as RawTeamMember));
}

export async function addTeamMember(
  teamId: string,
  characterId: number,
): Promise<TaktikaTeamMember> {
  const { data, error } = await supabase
    .from("taktika_team_members")
    .insert({ team_id: teamId, character_id: characterId })
    .select(MEMBER_SELECT)
    .single();
  if (error) throw error;
  return normalizeMember(data as RawTeamMember);
}

export async function updateTeamMemberRole(
  id: string,
  role: string,
): Promise<void> {
  const { error } = await supabase
    .from("taktika_team_members")
    .update({ role })
    .eq("id", id);
  if (error) throw error;
}

export async function removeTeamMember(id: string): Promise<void> {
  const { error } = await supabase
    .from("taktika_team_members")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
