"use client";

import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import CharacterSearch from "@/components/character-search";
import RequireFeature from "@/components/require-feature";
import type { Character } from "@/lib/characters";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeamMembers,
  listTeams,
  removeTeamMember,
  renameTeam,
  updateTeamMemberRole,
  type TaktikaTeam,
  type TaktikaTeamMember,
} from "@/lib/taktika-teams";
import { gbPath } from "@/lib/gb-years";
import { useGbYear } from "@/lib/use-gb-year";

const fieldClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

function TeamCard({
  team,
  canWrite,
  onDeleted,
}: {
  team: TaktikaTeam;
  canWrite: boolean;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(team.name);
  const [members, setMembers] = useState<TaktikaTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listTeamMembers(team.id)
      .then(setMembers)
      .finally(() => setIsLoading(false));
  }, [team.id]);

  const handleNameBlur = async () => {
    if (!canWrite) return;
    const trimmed = name.trim() || "Équipe sans nom";
    setName(trimmed);
    if (trimmed !== team.name) {
      await renameTeam(team.id, trimmed);
    }
  };

  const handleAdd = async (character: Character) => {
    const created = await addTeamMember(team.id, character.external_id);
    setMembers((prev) => [...prev, created]);
  };

  const handleRoleChange = (id: string, role: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  };

  const handleRoleBlur = async (member: TaktikaTeamMember) => {
    if (!canWrite) return;
    await updateTeamMemberRole(member.id, member.role ?? "");
  };

  const handleRemoveMember = async (member: TaktikaTeamMember) => {
    await removeTeamMember(member.id);
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  };

  const handleDeleteTeam = async () => {
    if (!confirm(`Supprimer l'équipe « ${team.name} » ?`)) return;
    await deleteTeam(team.id);
    onDeleted(team.id);
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:border dark:border-white/60 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          disabled={!canWrite}
          className={`flex-1 text-lg font-semibold ${fieldClassName} disabled:opacity-60`}
        />
        {canWrite && (
          <button
            type="button"
            onClick={handleDeleteTeam}
            aria-label="Supprimer l'équipe"
            className="rounded-full p-2 text-foreground/50 transition-colors hover:bg-black/[.05] hover:text-red-600 dark:hover:bg-white/[.08]"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {isLoading ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : (
          <>
            {members.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucun membre pour l&apos;instant.
              </p>
            )}
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-black/[.06] px-3 py-2 dark:border-white/[.06]"
              >
                <span className="flex-1 text-sm text-foreground">
                  {m.name}
                  {m.player_name && (
                    <span className="text-foreground/50">
                      {" "}
                      — {m.player_name}
                    </span>
                  )}
                </span>
                <input
                  type="text"
                  value={m.role ?? ""}
                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  onBlur={() => handleRoleBlur(m)}
                  placeholder="Rôle (ex. Capitaine)"
                  disabled={!canWrite}
                  className={`w-48 ${fieldClassName} disabled:opacity-60`}
                />
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m)}
                    aria-label="Retirer"
                    className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {canWrite && (
              <CharacterSearch
                onSelect={handleAdd}
                excludeIds={members.map((m) => m.character_id)}
                placeholder="Rechercher un personnage à ajouter…"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TaktikaEquipesContent() {
  const gbYear = useGbYear();
  const [teams, setTeams] = useState<TaktikaTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["tournois"] === "ecriture");
      });
    });
    listTeams(gbYear)
      .then(setTeams)
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gbYear is fixed for the page; the [annee] layout remounts it on a year change
  }, []);

  const handleCreateTeam = async () => {
    const created = await createTeam(gbYear, "Nouvelle équipe");
    setTeams((prev) => [...prev, created]);
  };

  const handleDeleted = (id: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div>
      <Link
        href={gbPath(gbYear, "tournois/taktika")}
        className="flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Taktika
      </Link>
      <h1 className={`${glofters.className} mt-2 text-3xl text-foreground`}>
        Équipes
      </h1>
      <Breadcrumb />

      {canWrite && (
        <button
          type="button"
          onClick={handleCreateTeam}
          className="mt-6 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Nouvelle équipe
        </button>
      )}

      {isLoading ? (
        <p className="mt-8 text-sm text-foreground/60">Chargement…</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canWrite={canWrite}
              onDeleted={handleDeleted}
            />
          ))}
          {teams.length === 0 && (
            <p className="text-sm text-foreground/60">
              Aucune équipe pour l&apos;instant.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaktikaEquipesPage() {
  return (
    <RequireFeature feature="tournois">
      <TaktikaEquipesContent />
    </RequireFeature>
  );
}
