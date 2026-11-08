import { supabase } from "@/lib/supabase";

export type ScenarioKey = "controle_terrain" | "rouleaux" | "aneantir";

export const SCENARIOS: Record<
  ScenarioKey,
  { label: string; metricLabel: string }
> = {
  controle_terrain: {
    label: "Contrôle du terrain",
    metricLabel: "Temps de contrôle (secondes)",
  },
  rouleaux: {
    label: "Rouleaux mécaniques",
    metricLabel: "Points du rouleau",
  },
  aneantir: {
    label: "Anéantir l'ennemi",
    metricLabel: "Ennemis tués",
  },
};

export const SCENARIO_ORDER: ScenarioKey[] = [
  "controle_terrain",
  "rouleaux",
  "aneantir",
];

const RANK_POINTS = [15, 10, 5];

export type TaktikaTournament = {
  id: string;
  name: string;
  pool_count: number;
  pool_scenarios: ScenarioKey[];
  final_scenario: ScenarioKey;
  qualifiers_count: number;
  status: "pools" | "bracket" | "done";
  created_at: string;
};

export type TournamentTeam = {
  id: string;
  team_id: string;
  pool_index: number;
  team_name: string;
};

export type PoolMatch = {
  id: string;
  pool_index: number;
  scenario: ScenarioKey;
  team1_id: string;
  team2_id: string;
  team1_name: string;
  team2_name: string;
  metric1: number | null;
  metric2: number | null;
  winner_team_id: string | null;
  start_time: string;
  end_time: string;
  location: string;
  position: number;
};

export type BracketMatch = {
  id: string;
  round: number;
  slot: number;
  scenario: ScenarioKey;
  team1_id: string | null;
  team2_id: string | null;
  team1_name: string | null;
  team2_name: string | null;
  metric1: number | null;
  metric2: number | null;
  winner_team_id: string | null;
  start_time: string;
  end_time: string;
  location: string;
};

export type ScenarioStanding = {
  team_id: string;
  team_name: string;
  played: number;
  wins: number;
  metric_total: number;
  points: number;
};

export type TotalStanding = {
  team_id: string;
  team_name: string;
  pool_index: number;
  total_points: number;
  total_wins: number;
};

const TOURNAMENT_SELECT =
  "id, name, pool_count, pool_scenarios, final_scenario, qualifiers_count, status, created_at";

export async function listTournaments(
  year: number,
): Promise<TaktikaTournament[]> {
  const { data, error } = await supabase
    .from("taktika_tournaments")
    .select(TOURNAMENT_SELECT)
    .eq("year", year)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTournament(
  id: string,
): Promise<TaktikaTournament | null> {
  const { data, error } = await supabase
    .from("taktika_tournaments")
    .select(TOURNAMENT_SELECT)
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function regeneratePoolMatches(
  tournamentId: string,
): Promise<void> {
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Tournoi introuvable");

  const { data: teamRows, error: teamsError } = await supabase
    .from("taktika_tournament_teams")
    .select("team_id, pool_index")
    .eq("tournament_id", tournamentId);
  if (teamsError) throw teamsError;

  const { error: deleteError } = await supabase
    .from("taktika_pool_matches")
    .delete()
    .eq("tournament_id", tournamentId);
  if (deleteError) throw deleteError;

  const rows: {
    tournament_id: string;
    pool_index: number;
    scenario: ScenarioKey;
    team1_id: string;
    team2_id: string;
    position: number;
  }[] = [];

  for (let pool = 0; pool < tournament.pool_count; pool++) {
    const poolTeams = (teamRows ?? [])
      .filter((t) => t.pool_index === pool)
      .map((t) => t.team_id);
    let position = 0;
    for (const scenario of tournament.pool_scenarios) {
      for (let i = 0; i < poolTeams.length; i++) {
        for (let j = i + 1; j < poolTeams.length; j++) {
          rows.push({
            tournament_id: tournamentId,
            pool_index: pool,
            scenario,
            team1_id: poolTeams[i],
            team2_id: poolTeams[j],
            position: position++,
          });
        }
      }
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("taktika_pool_matches").insert(rows);
    if (error) throw error;
  }
}

export async function createTournament(
  year: number,
  name: string,
  teamIds: string[],
  poolCount: number,
  poolScenarios: ScenarioKey[],
  finalScenario: ScenarioKey,
  qualifiersCount: number,
): Promise<TaktikaTournament> {
  const { data: tournament, error } = await supabase
    .from("taktika_tournaments")
    .insert({
      name,
      year,
      pool_count: poolCount,
      pool_scenarios: poolScenarios,
      final_scenario: finalScenario,
      qualifiers_count: qualifiersCount,
      status: "pools",
    })
    .select(TOURNAMENT_SELECT)
    .single();
  if (error) throw error;

  const shuffled = shuffle(teamIds);
  const teamRows = shuffled.map((teamId, index) => ({
    tournament_id: tournament.id,
    team_id: teamId,
    pool_index: index % poolCount,
  }));
  const { error: teamsError } = await supabase
    .from("taktika_tournament_teams")
    .insert(teamRows);
  if (teamsError) throw teamsError;

  await regeneratePoolMatches(tournament.id);

  return tournament;
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase
    .from("taktika_tournaments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getTournamentTeams(
  tournamentId: string,
): Promise<TournamentTeam[]> {
  const { data, error } = await supabase
    .from("taktika_tournament_teams")
    .select(
      "id, team_id, pool_index, taktika_teams!taktika_tournament_teams_team_id_fkey(name)",
    )
    .eq("tournament_id", tournamentId)
    .order("pool_index", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const team = Array.isArray(row.taktika_teams)
      ? row.taktika_teams[0]
      : row.taktika_teams;
    return {
      id: row.id,
      team_id: row.team_id,
      pool_index: row.pool_index,
      team_name: team?.name ?? "",
    };
  });
}

const POOL_MATCH_SELECT =
  "id, pool_index, scenario, team1_id, team2_id, metric1, metric2, winner_team_id, start_time, end_time, location, position, " +
  "team1:taktika_teams!taktika_pool_matches_team1_id_fkey(name), " +
  "team2:taktika_teams!taktika_pool_matches_team2_id_fkey(name)";

type RawTeamNameJoin = { name: string } | { name: string }[] | null;

type RawPoolMatchRow = {
  id: string;
  pool_index: number;
  scenario: ScenarioKey;
  team1_id: string;
  team2_id: string;
  metric1: number | null;
  metric2: number | null;
  winner_team_id: string | null;
  start_time: string;
  end_time: string;
  location: string;
  position: number;
  team1: RawTeamNameJoin;
  team2: RawTeamNameJoin;
};

export async function getPoolMatches(
  tournamentId: string,
): Promise<PoolMatch[]> {
  const { data, error } = await supabase
    .from("taktika_pool_matches")
    .select(POOL_MATCH_SELECT)
    .eq("tournament_id", tournamentId)
    .order("pool_index", { ascending: true })
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawPoolMatchRow[]).map((row) => {
    const team1 = Array.isArray(row.team1) ? row.team1[0] : row.team1;
    const team2 = Array.isArray(row.team2) ? row.team2[0] : row.team2;
    return {
      id: row.id,
      pool_index: row.pool_index,
      scenario: row.scenario,
      team1_id: row.team1_id,
      team2_id: row.team2_id,
      team1_name: team1?.name ?? "",
      team2_name: team2?.name ?? "",
      metric1: row.metric1,
      metric2: row.metric2,
      winner_team_id: row.winner_team_id,
      start_time: row.start_time,
      end_time: row.end_time,
      location: row.location,
      position: row.position,
    };
  });
}

export async function updatePoolMatchSchedule(
  id: string,
  fields: Partial<{ start_time: string; end_time: string; location: string }>,
): Promise<void> {
  const { error } = await supabase
    .from("taktika_pool_matches")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}

export async function recordPoolMatchResult(
  id: string,
  winnerTeamId: string | null,
  metric1: number | null,
  metric2: number | null,
): Promise<void> {
  const { error } = await supabase
    .from("taktika_pool_matches")
    .update({ winner_team_id: winnerTeamId, metric1, metric2 })
    .eq("id", id);
  if (error) throw error;
}

export function computeScenarioStandings(
  teams: TournamentTeam[],
  matches: PoolMatch[],
  poolIndex: number,
  scenario: ScenarioKey,
): ScenarioStanding[] {
  const poolTeams = teams.filter((t) => t.pool_index === poolIndex);
  const stats = new Map<string, ScenarioStanding>(
    poolTeams.map((t) => [
      t.team_id,
      {
        team_id: t.team_id,
        team_name: t.team_name,
        played: 0,
        wins: 0,
        metric_total: 0,
        points: 0,
      },
    ]),
  );

  for (const m of matches.filter(
    (m) => m.pool_index === poolIndex && m.scenario === scenario,
  )) {
    if (!m.winner_team_id) continue;
    const s1 = stats.get(m.team1_id);
    const s2 = stats.get(m.team2_id);
    if (!s1 || !s2) continue;
    s1.played++;
    s2.played++;
    if (m.metric1 != null) s1.metric_total += m.metric1;
    if (m.metric2 != null) s2.metric_total += m.metric2;
    if (m.winner_team_id === m.team1_id) s1.wins++;
    else if (m.winner_team_id === m.team2_id) s2.wins++;
  }

  const ranked = [...stats.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.metric_total - a.metric_total ||
      a.team_name.localeCompare(b.team_name),
  );
  return ranked.map((s, i) => ({ ...s, points: RANK_POINTS[i] ?? 0 }));
}

export function computeTotalStandings(
  teams: TournamentTeam[],
  matches: PoolMatch[],
  poolCount: number,
  poolScenarios: ScenarioKey[],
): TotalStanding[] {
  const totals = new Map<string, TotalStanding>();
  for (let pool = 0; pool < poolCount; pool++) {
    for (const scenario of poolScenarios) {
      const standings = computeScenarioStandings(
        teams,
        matches,
        pool,
        scenario,
      );
      for (const s of standings) {
        const existing = totals.get(s.team_id) ?? {
          team_id: s.team_id,
          team_name: s.team_name,
          pool_index: pool,
          total_points: 0,
          total_wins: 0,
        };
        existing.total_points += s.points;
        existing.total_wins += s.wins;
        totals.set(s.team_id, existing);
      }
    }
  }
  return [...totals.values()].sort(
    (a, b) =>
      b.total_points - a.total_points ||
      b.total_wins - a.total_wins ||
      a.team_name.localeCompare(b.team_name),
  );
}

function seedOrder(size: number): number[] {
  if (size === 1) return [1];
  const prev = seedOrder(size / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s, size + 1 - s);
  }
  return result;
}

export async function generateBracket(tournamentId: string): Promise<void> {
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error("Tournoi introuvable");

  const [teams, matches] = await Promise.all([
    getTournamentTeams(tournamentId),
    getPoolMatches(tournamentId),
  ]);

  const totals = computeTotalStandings(
    teams,
    matches,
    tournament.pool_count,
    tournament.pool_scenarios,
  );
  const qualifiers = totals.slice(0, tournament.qualifiers_count);

  let bracketSize = 1;
  while (bracketSize < qualifiers.length) bracketSize *= 2;
  if (bracketSize < 2) bracketSize = 2;

  const order = seedOrder(bracketSize);
  const slots: (string | null)[] = order.map((seed) =>
    seed <= qualifiers.length ? qualifiers[seed - 1].team_id : null,
  );

  const totalRounds = Math.log2(bracketSize);
  const rows: {
    tournament_id: string;
    round: number;
    slot: number;
    scenario: ScenarioKey;
    team1_id: string | null;
    team2_id: string | null;
  }[] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const matchesInRound = bracketSize / 2 ** r;
    for (let s = 0; s < matchesInRound; s++) {
      rows.push({
        tournament_id: tournamentId,
        round: r,
        slot: s,
        scenario: tournament.final_scenario,
        team1_id: r === 1 ? slots[s * 2] : null,
        team2_id: r === 1 ? slots[s * 2 + 1] : null,
      });
    }
  }

  const { error } = await supabase.from("taktika_bracket_matches").insert(rows);
  if (error) throw error;

  const round1Byes = rows.filter(
    (r) =>
      r.round === 1 &&
      ((r.team1_id && !r.team2_id) || (!r.team1_id && r.team2_id)),
  );
  for (const bye of round1Byes) {
    const winner = bye.team1_id ?? bye.team2_id;
    if (!winner) continue;
    await supabase
      .from("taktika_bracket_matches")
      .update({ winner_team_id: winner })
      .eq("tournament_id", tournamentId)
      .eq("round", 1)
      .eq("slot", bye.slot);
    if (totalRounds > 1) {
      const nextSlot = Math.floor(bye.slot / 2);
      const field = bye.slot % 2 === 0 ? "team1_id" : "team2_id";
      await supabase
        .from("taktika_bracket_matches")
        .update({ [field]: winner })
        .eq("tournament_id", tournamentId)
        .eq("round", 2)
        .eq("slot", nextSlot);
    }
  }

  await supabase
    .from("taktika_tournaments")
    .update({ status: "bracket" })
    .eq("id", tournamentId);
}

const BRACKET_MATCH_SELECT =
  "id, round, slot, scenario, team1_id, team2_id, metric1, metric2, winner_team_id, start_time, end_time, location, " +
  "team1:taktika_teams!taktika_bracket_matches_team1_id_fkey(name), " +
  "team2:taktika_teams!taktika_bracket_matches_team2_id_fkey(name)";

type RawBracketMatchRow = {
  id: string;
  round: number;
  slot: number;
  scenario: ScenarioKey;
  team1_id: string | null;
  team2_id: string | null;
  metric1: number | null;
  metric2: number | null;
  winner_team_id: string | null;
  start_time: string;
  end_time: string;
  location: string;
  team1: RawTeamNameJoin;
  team2: RawTeamNameJoin;
};

export async function getBracketMatches(
  tournamentId: string,
): Promise<BracketMatch[]> {
  const { data, error } = await supabase
    .from("taktika_bracket_matches")
    .select(BRACKET_MATCH_SELECT)
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("slot", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawBracketMatchRow[]).map((row) => {
    const team1 = Array.isArray(row.team1) ? row.team1[0] : row.team1;
    const team2 = Array.isArray(row.team2) ? row.team2[0] : row.team2;
    return {
      id: row.id,
      round: row.round,
      slot: row.slot,
      scenario: row.scenario,
      team1_id: row.team1_id,
      team2_id: row.team2_id,
      team1_name: team1?.name ?? null,
      team2_name: team2?.name ?? null,
      metric1: row.metric1,
      metric2: row.metric2,
      winner_team_id: row.winner_team_id,
      start_time: row.start_time,
      end_time: row.end_time,
      location: row.location,
    };
  });
}

export async function updateBracketMatchSchedule(
  id: string,
  fields: Partial<{ start_time: string; end_time: string; location: string }>,
): Promise<void> {
  const { error } = await supabase
    .from("taktika_bracket_matches")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}

export async function recordBracketMatchResult(
  tournamentId: string,
  match: BracketMatch,
  winnerTeamId: string,
  metric1: number | null,
  metric2: number | null,
): Promise<void> {
  const { error } = await supabase
    .from("taktika_bracket_matches")
    .update({ winner_team_id: winnerTeamId, metric1, metric2 })
    .eq("id", match.id);
  if (error) throw error;

  const { data: allMatches, error: allError } = await supabase
    .from("taktika_bracket_matches")
    .select("round")
    .eq("tournament_id", tournamentId);
  if (allError) throw allError;
  const maxRound = Math.max(...(allMatches ?? []).map((m) => m.round));

  if (match.round >= maxRound) {
    await supabase
      .from("taktika_tournaments")
      .update({ status: "done" })
      .eq("id", tournamentId);
    return;
  }

  const nextSlot = Math.floor(match.slot / 2);
  const field = match.slot % 2 === 0 ? "team1_id" : "team2_id";
  await supabase
    .from("taktika_bracket_matches")
    .update({ [field]: winnerTeamId })
    .eq("tournament_id", tournamentId)
    .eq("round", match.round + 1)
    .eq("slot", nextSlot);
}
