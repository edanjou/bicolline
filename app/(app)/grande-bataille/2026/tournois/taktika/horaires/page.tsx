"use client";

import { ArrowLeft, Plus, Trash2, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import { listTeams, type TaktikaTeam } from "@/lib/taktika-teams";
import {
  computeScenarioStandings,
  computeTotalStandings,
  createTournament,
  deleteTournament,
  generateBracket,
  getBracketMatches,
  getPoolMatches,
  getTournament,
  getTournamentTeams,
  listTournaments,
  recordBracketMatchResult,
  recordPoolMatchResult,
  regeneratePoolMatches,
  SCENARIO_ORDER,
  SCENARIOS,
  updateBracketMatchSchedule,
  updatePoolMatchSchedule,
  type BracketMatch,
  type PoolMatch,
  type ScenarioKey,
  type TaktikaTournament,
  type TournamentTeam,
} from "@/lib/taktika-tournaments";

const fieldClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

const POOL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function CreateTournamentForm({
  onCreated,
}: {
  onCreated: (t: TaktikaTournament) => void;
}) {
  const [teams, setTeams] = useState<TaktikaTeam[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [poolCount, setPoolCount] = useState(2);
  const [poolScenarios, setPoolScenarios] = useState<Set<ScenarioKey>>(
    new Set(["controle_terrain", "rouleaux"]),
  );
  const [finalScenario, setFinalScenario] = useState<ScenarioKey>("aneantir");
  const [qualifiersCount, setQualifiersCount] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTeams().then(setTeams);
  }, []);

  const toggleTeam = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePoolScenario = (key: ScenarioKey) => {
    setPoolScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Le nom du tournoi est requis.");
      return;
    }
    if (selected.size < poolCount) {
      setError("Pas assez d'équipes sélectionnées pour ce nombre de poules.");
      return;
    }
    if (poolScenarios.size === 0) {
      setError("Sélectionne au moins un scénario pour la phase de poules.");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createTournament(
        name.trim(),
        [...selected],
        poolCount,
        [...poolScenarios],
        finalScenario,
        qualifiersCount,
      );
      onCreated(created);
    } catch {
      setError("Échec de la création du tournoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-foreground">Nouveau tournoi</h2>
      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">
            Nom du tournoi
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Tournoi Taktika — été 2026"
            className={`w-full ${fieldClassName}`}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Nombre de poules
            </label>
            <input
              type="number"
              min={1}
              value={poolCount}
              onChange={(e) => setPoolCount(Math.max(1, Number(e.target.value)))}
              className={`w-28 ${fieldClassName}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Équipes qualifiées pour les finales (total)
            </label>
            <input
              type="number"
              min={2}
              value={qualifiersCount}
              onChange={(e) =>
                setQualifiersCount(Math.max(2, Number(e.target.value)))
              }
              className={`w-28 ${fieldClassName}`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">
            Scénarios en phase de poules
          </label>
          <div className="flex flex-wrap gap-3">
            {SCENARIO_ORDER.map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={poolScenarios.has(key)}
                  onChange={() => togglePoolScenario(key)}
                />
                {SCENARIOS[key].label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">
            Scénario des finales (bracket)
          </label>
          <div className="flex flex-wrap gap-3">
            {SCENARIO_ORDER.map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="final_scenario"
                  checked={finalScenario === key}
                  onChange={() => setFinalScenario(key)}
                />
                {SCENARIOS[key].label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">
            Équipes participantes ({selected.size})
          </label>
          <div className="flex flex-col gap-1 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]">
            {teams.length === 0 && (
              <p className="p-2 text-sm text-foreground/60">
                Aucune équipe créée. Ajoute des équipes dans « Équipes »
                d&apos;abord.
              </p>
            )}
            {teams.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/[.03] dark:hover:bg-white/[.06]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggleTeam(t.id)}
                />
                {t.name}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-fit rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "Création…" : "Créer le tournoi et générer les poules"}
        </button>
      </div>
    </div>
  );
}

function WinnerPicker({
  team1Name,
  team2Name,
  winnerId,
  team1Id,
  team2Id,
  canWrite,
  onPick,
}: {
  team1Name: string;
  team2Name: string;
  winnerId: string | null;
  team1Id: string;
  team2Id: string;
  canWrite: boolean;
  onPick: (winnerId: string) => void;
}) {
  return (
    <div className="flex flex-1 items-center gap-1.5">
      <button
        type="button"
        disabled={!canWrite}
        onClick={() => onPick(team1Id)}
        className={`flex-1 rounded-full border px-2 py-1 text-left text-sm transition-colors disabled:opacity-70 ${
          winnerId === team1Id
            ? "border-primary bg-primary/10 font-semibold text-primary"
            : "border-black/[.08] text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
        }`}
      >
        {winnerId === team1Id && <Trophy size={12} className="mr-1 inline" />}
        {team1Name}
      </button>
      <span className="text-xs text-foreground/40">vs</span>
      <button
        type="button"
        disabled={!canWrite}
        onClick={() => onPick(team2Id)}
        className={`flex-1 rounded-full border px-2 py-1 text-left text-sm transition-colors disabled:opacity-70 ${
          winnerId === team2Id
            ? "border-primary bg-primary/10 font-semibold text-primary"
            : "border-black/[.08] text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
        }`}
      >
        {winnerId === team2Id && <Trophy size={12} className="mr-1 inline" />}
        {team2Name}
      </button>
    </div>
  );
}

function PoolMatchRow({
  match,
  canWrite,
  onScheduleChange,
  onScheduleBlur,
  onResult,
}: {
  match: PoolMatch;
  canWrite: boolean;
  onScheduleChange: (
    id: string,
    field: "start_time" | "location",
    value: string,
  ) => void;
  onScheduleBlur: (id: string) => void;
  onResult: (
    id: string,
    winnerTeamId: string,
    metric1: number | null,
    metric2: number | null,
  ) => void;
}) {
  const [metric1, setMetric1] = useState(match.metric1?.toString() ?? "");
  const [metric2, setMetric2] = useState(match.metric2?.toString() ?? "");
  const metricLabel = SCENARIOS[match.scenario].metricLabel;

  const commit = (winnerTeamId: string) => {
    onResult(
      match.id,
      winnerTeamId,
      metric1 === "" ? null : Number(metric1),
      metric2 === "" ? null : Number(metric2),
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/[.06] p-2 dark:border-white/[.06]">
      <input
        type="time"
        value={match.start_time}
        onChange={(e) => onScheduleChange(match.id, "start_time", e.target.value)}
        onBlur={() => onScheduleBlur(match.id)}
        disabled={!canWrite}
        className={`${fieldClassName} disabled:opacity-60`}
      />
      <input
        type="text"
        value={match.location}
        onChange={(e) => onScheduleChange(match.id, "location", e.target.value)}
        onBlur={() => onScheduleBlur(match.id)}
        placeholder="Lieu"
        disabled={!canWrite}
        className={`w-28 ${fieldClassName} disabled:opacity-60`}
      />
      <WinnerPicker
        team1Name={match.team1_name}
        team2Name={match.team2_name}
        team1Id={match.team1_id}
        team2Id={match.team2_id}
        winnerId={match.winner_team_id}
        canWrite={canWrite}
        onPick={commit}
      />
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={metric1}
          onChange={(e) => setMetric1(e.target.value)}
          onBlur={() => match.winner_team_id && commit(match.winner_team_id)}
          disabled={!canWrite}
          placeholder={metricLabel}
          title={metricLabel}
          className={`w-20 ${fieldClassName} disabled:opacity-60`}
        />
        <span className="text-foreground/40">/</span>
        <input
          type="number"
          value={metric2}
          onChange={(e) => setMetric2(e.target.value)}
          onBlur={() => match.winner_team_id && commit(match.winner_team_id)}
          disabled={!canWrite}
          placeholder={metricLabel}
          title={metricLabel}
          className={`w-20 ${fieldClassName} disabled:opacity-60`}
        />
      </div>
    </div>
  );
}

function StandingsTable({
  teams,
  matches,
  poolIndex,
  scenario,
}: {
  teams: TournamentTeam[];
  matches: PoolMatch[];
  poolIndex: number;
  scenario: ScenarioKey;
}) {
  const standings = computeScenarioStandings(teams, matches, poolIndex, scenario);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-foreground/50">
            <th className="py-1 pr-2">Équipe</th>
            <th className="px-2">J</th>
            <th className="px-2">V</th>
            <th className="px-2">{SCENARIOS[scenario].metricLabel}</th>
            <th className="px-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.team_id}
              className={
                i > 0 ? "border-t border-black/[.05] dark:border-white/[.06]" : ""
              }
            >
              <td className="py-1 pr-2 font-medium text-foreground">
                {s.team_name}
              </td>
              <td className="px-2">{s.played}</td>
              <td className="px-2">{s.wins}</td>
              <td className="px-2">{s.metric_total}</td>
              <td className="px-2 font-semibold">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalStandingsTable({
  teams,
  matches,
  poolCount,
  poolScenarios,
  poolIndex,
}: {
  teams: TournamentTeam[];
  matches: PoolMatch[];
  poolCount: number;
  poolScenarios: ScenarioKey[];
  poolIndex: number;
}) {
  const totals = computeTotalStandings(
    teams,
    matches,
    poolCount,
    poolScenarios,
  ).filter((t) => t.pool_index === poolIndex);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-foreground/50">
            <th className="py-1 pr-2">Équipe</th>
            <th className="px-2">Total pts</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t, i) => (
            <tr
              key={t.team_id}
              className={
                i > 0 ? "border-t border-black/[.05] dark:border-white/[.06]" : ""
              }
            >
              <td className="py-1 pr-2 font-medium text-foreground">
                {t.team_name}
              </td>
              <td className="px-2 font-semibold">{t.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BracketMatchCard({
  match,
  canWrite,
  onScheduleChange,
  onScheduleBlur,
  onResult,
}: {
  match: BracketMatch;
  canWrite: boolean;
  onScheduleChange: (
    id: string,
    field: "start_time" | "location",
    value: string,
  ) => void;
  onScheduleBlur: (id: string) => void;
  onResult: (
    id: string,
    winnerTeamId: string,
    metric1: number | null,
    metric2: number | null,
  ) => void;
}) {
  const [metric1, setMetric1] = useState(match.metric1?.toString() ?? "");
  const [metric2, setMetric2] = useState(match.metric2?.toString() ?? "");
  const ready = Boolean(match.team1_id && match.team2_id);
  const metricLabel = SCENARIOS[match.scenario].metricLabel;

  const commit = (winnerTeamId: string) => {
    onResult(
      match.id,
      winnerTeamId,
      metric1 === "" ? null : Number(metric1),
      metric2 === "" ? null : Number(metric2),
    );
  };

  return (
    <div className="flex w-64 flex-col gap-1.5 rounded-lg border border-black/[.08] bg-white p-2.5 shadow-sm dark:border-white/[.145] dark:bg-zinc-900">
      <div className="flex items-center gap-1.5">
        <input
          type="time"
          value={match.start_time}
          onChange={(e) =>
            onScheduleChange(match.id, "start_time", e.target.value)
          }
          onBlur={() => onScheduleBlur(match.id)}
          disabled={!canWrite}
          className={`flex-1 !px-2 !py-1 text-xs ${fieldClassName} disabled:opacity-60`}
        />
        <input
          type="text"
          value={match.location}
          onChange={(e) => onScheduleChange(match.id, "location", e.target.value)}
          onBlur={() => onScheduleBlur(match.id)}
          placeholder="Lieu"
          disabled={!canWrite}
          className={`flex-1 !px-2 !py-1 text-xs ${fieldClassName} disabled:opacity-60`}
        />
      </div>
      {ready ? (
        <>
          <WinnerPicker
            team1Name={match.team1_name ?? ""}
            team2Name={match.team2_name ?? ""}
            team1Id={match.team1_id as string}
            team2Id={match.team2_id as string}
            winnerId={match.winner_team_id}
            canWrite={canWrite}
            onPick={commit}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={metric1}
              onChange={(e) => setMetric1(e.target.value)}
              onBlur={() => match.winner_team_id && commit(match.winner_team_id)}
              disabled={!canWrite}
              placeholder={metricLabel}
              title={metricLabel}
              className={`w-full !px-1 !py-0.5 text-xs ${fieldClassName} disabled:opacity-40`}
            />
            <input
              type="number"
              value={metric2}
              onChange={(e) => setMetric2(e.target.value)}
              onBlur={() => match.winner_team_id && commit(match.winner_team_id)}
              disabled={!canWrite}
              placeholder={metricLabel}
              title={metricLabel}
              className={`w-full !px-1 !py-0.5 text-xs ${fieldClassName} disabled:opacity-40`}
            />
          </div>
        </>
      ) : (
        <p className="px-1 py-1 text-sm text-foreground/40">À déterminer</p>
      )}
    </div>
  );
}

function TournamentDetail({
  tournament,
  canWrite,
  onDeleted,
  onChanged,
}: {
  tournament: TaktikaTournament;
  canWrite: boolean;
  onDeleted: () => void;
  onChanged: (t: TaktikaTournament) => void;
}) {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [poolMatches, setPoolMatches] = useState<PoolMatch[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"pools" | "bracket">("pools");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      getTournamentTeams(tournament.id),
      getPoolMatches(tournament.id),
      tournament.status !== "pools"
        ? getBracketMatches(tournament.id)
        : Promise.resolve([]),
    ])
      .then(([t, p, b]) => {
        setTeams(t);
        setPoolMatches(p);
        setBracketMatches(b);
        if (tournament.status !== "pools") setView("bracket");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag set ahead of an async fetch
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable for a given tournament id/status
  }, [tournament.id, tournament.status]);

  const handlePoolScheduleChange = (
    id: string,
    field: "start_time" | "location",
    value: string,
  ) => {
    setPoolMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  const handlePoolScheduleBlur = async (id: string) => {
    if (!canWrite) return;
    const m = poolMatches.find((m) => m.id === id);
    if (!m) return;
    await updatePoolMatchSchedule(id, {
      start_time: m.start_time,
      location: m.location,
    });
  };

  const handlePoolResult = async (
    id: string,
    winnerTeamId: string,
    metric1: number | null,
    metric2: number | null,
  ) => {
    if (!canWrite) return;
    setPoolMatches((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, winner_team_id: winnerTeamId, metric1, metric2 }
          : m,
      ),
    );
    await recordPoolMatchResult(id, winnerTeamId, metric1, metric2);
  };

  const handleBracketScheduleChange = (
    id: string,
    field: "start_time" | "location",
    value: string,
  ) => {
    setBracketMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  const handleBracketScheduleBlur = async (id: string) => {
    if (!canWrite) return;
    const m = bracketMatches.find((m) => m.id === id);
    if (!m) return;
    await updateBracketMatchSchedule(id, {
      start_time: m.start_time,
      location: m.location,
    });
  };

  const handleBracketResult = async (
    id: string,
    winnerTeamId: string,
    metric1: number | null,
    metric2: number | null,
  ) => {
    if (!canWrite) return;
    const m = bracketMatches.find((m) => m.id === id);
    if (!m) return;
    await recordBracketMatchResult(tournament.id, m, winnerTeamId, metric1, metric2);
    const [b, t] = await Promise.all([
      getBracketMatches(tournament.id),
      getTournament(tournament.id),
    ]);
    setBracketMatches(b);
    if (t && t.status !== tournament.status) onChanged(t);
  };

  const handleRegenerateMatches = async () => {
    if (!confirm("Régénérer les matchs de poule ? Les résultats déjà entrés seront perdus."))
      return;
    setIsRegenerating(true);
    try {
      await regeneratePoolMatches(tournament.id);
      const p = await getPoolMatches(tournament.id);
      setPoolMatches(p);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGenerateBracket = async () => {
    setIsGenerating(true);
    try {
      await generateBracket(tournament.id);
      const b = await getBracketMatches(tournament.id);
      setBracketMatches(b);
      setView("bracket");
      onChanged({ ...tournament, status: "bracket" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer le tournoi « ${tournament.name} » ?`)) return;
    await deleteTournament(tournament.id);
    onDeleted();
  };

  const allPoolMatchesScored =
    poolMatches.length > 0 && poolMatches.every((m) => m.winner_team_id != null);

  const roundsMax =
    bracketMatches.length > 0
      ? Math.max(...bracketMatches.map((m) => m.round))
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {tournament.name}
        </h2>
        {canWrite && (
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Supprimer le tournoi"
            className="rounded-full p-2 text-foreground/50 transition-colors hover:bg-black/[.05] hover:text-red-600 dark:hover:bg-white/[.08]"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setView("pools")}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            view === "pools"
              ? "border-primary bg-primary text-white"
              : "border-black/[.08] bg-white text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
          }`}
        >
          Poules
        </button>
        <button
          type="button"
          onClick={() => setView("bracket")}
          disabled={tournament.status === "pools"}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
            view === "bracket"
              ? "border-primary bg-primary text-white"
              : "border-black/[.08] bg-white text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
          }`}
        >
          Bracket final — {SCENARIOS[tournament.final_scenario].label}
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-foreground/60">Chargement…</p>
      ) : view === "pools" ? (
        <div className="mt-6 flex flex-col gap-6">
          {canWrite && tournament.status === "pools" && (
            <button
              type="button"
              onClick={handleRegenerateMatches}
              disabled={isRegenerating}
              className="w-fit text-xs font-medium text-foreground/50 hover:underline disabled:opacity-60"
            >
              {isRegenerating ? "Régénération…" : "Régénérer les matchs de poule"}
            </button>
          )}

          {Array.from({ length: tournament.pool_count }, (_, pool) => (
            <div
              key={pool}
              className="rounded-2xl bg-white p-5 shadow-sm dark:border dark:border-white/60 dark:bg-zinc-900"
            >
              <h3 className="font-semibold text-foreground">
                Poule {POOL_LETTERS[pool] ?? pool + 1}
              </h3>

              <div className="mt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
                  Classement total
                </p>
                <TotalStandingsTable
                  teams={teams}
                  matches={poolMatches}
                  poolCount={tournament.pool_count}
                  poolScenarios={tournament.pool_scenarios}
                  poolIndex={pool}
                />
              </div>

              {tournament.pool_scenarios.map((scenario) => (
                <div key={scenario} className="mt-5 border-t border-black/[.06] pt-4 dark:border-white/[.08]">
                  <h4 className="text-sm font-semibold text-foreground">
                    {SCENARIOS[scenario].label}
                  </h4>
                  <div className="mt-2">
                    <StandingsTable
                      teams={teams}
                      matches={poolMatches}
                      poolIndex={pool}
                      scenario={scenario}
                    />
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {poolMatches
                      .filter((m) => m.pool_index === pool && m.scenario === scenario)
                      .map((m) => (
                        <PoolMatchRow
                          key={m.id}
                          match={m}
                          canWrite={canWrite}
                          onScheduleChange={handlePoolScheduleChange}
                          onScheduleBlur={handlePoolScheduleBlur}
                          onResult={handlePoolResult}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {canWrite && tournament.status === "pools" && (
            <button
              type="button"
              onClick={handleGenerateBracket}
              disabled={!allPoolMatchesScored || isGenerating}
              className="w-fit rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isGenerating
                ? "Génération…"
                : allPoolMatchesScored
                  ? "Générer le bracket des finales"
                  : "Termine tous les matchs de poule pour générer le bracket"}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 flex gap-8 overflow-x-auto pb-4">
          {Array.from({ length: roundsMax }, (_, i) => i + 1).map((round) => (
            <div key={round} className="flex flex-col justify-around gap-6">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                {round === roundsMax
                  ? "Finale"
                  : round === roundsMax - 1
                    ? "Demi-finales"
                    : `Ronde ${round}`}
              </p>
              {bracketMatches
                .filter((m) => m.round === round)
                .map((m) => (
                  <BracketMatchCard
                    key={m.id}
                    match={m}
                    canWrite={canWrite}
                    onScheduleChange={handleBracketScheduleChange}
                    onScheduleBlur={handleBracketScheduleBlur}
                    onResult={handleBracketResult}
                  />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaktikaHorairesContent() {
  const [tournaments, setTournaments] = useState<TaktikaTournament[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["tournois"] === "ecriture");
      });
    });
    listTournaments()
      .then(setTournaments)
      .finally(() => setIsLoading(false));
  }, []);

  const selected = tournaments.find((t) => t.id === selectedId) ?? null;

  const handleCreated = (t: TaktikaTournament) => {
    setTournaments((prev) => [t, ...prev]);
    setSelectedId(t.id);
    setIsCreating(false);
  };

  const handleDeleted = () => {
    setTournaments((prev) => prev.filter((t) => t.id !== selectedId));
    setSelectedId(null);
  };

  const handleChanged = (t: TaktikaTournament) => {
    setTournaments((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  };

  return (
    <div>
      <Link
        href="/grande-bataille/2026/tournois/taktika"
        className="flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Taktika
      </Link>
      <h1 className={`${glofters.className} mt-2 text-3xl text-foreground`}>
        Gestion des horaires
      </h1>
      <Breadcrumb />

      {isLoading ? (
        <p className="mt-8 text-sm text-foreground/60">Chargement…</p>
      ) : selected ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="mb-4 flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Tous les tournois
          </button>
          <TournamentDetail
            tournament={selected}
            canWrite={canWrite}
            onDeleted={handleDeleted}
            onChanged={handleChanged}
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {tournaments.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className="flex items-center justify-between rounded-2xl bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md dark:border dark:border-white/60 dark:bg-zinc-900"
            >
              <div>
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-foreground/50">
                  {t.pool_count} poule{t.pool_count > 1 ? "s" : ""} ·{" "}
                  {t.status === "pools"
                    ? "Phase de poules"
                    : t.status === "bracket"
                      ? "Bracket en cours"
                      : "Terminé"}
                </p>
              </div>
            </button>
          ))}

          {tournaments.length === 0 && (
            <p className="text-sm text-foreground/60">
              Aucun tournoi pour l&apos;instant.
            </p>
          )}

          {canWrite && !isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex w-fit items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              Nouveau tournoi
            </button>
          )}

          {isCreating && <CreateTournamentForm onCreated={handleCreated} />}
        </div>
      )}
    </div>
  );
}

export default function TaktikaHorairesPage() {
  return (
    <RequireFeature feature="tournois">
      <TaktikaHorairesContent />
    </RequireFeature>
  );
}
