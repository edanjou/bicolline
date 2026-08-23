"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import CharacterSearch from "@/components/character-search";
import RequireFeature from "@/components/require-feature";
import type { Character } from "@/lib/characters";
import {
  createWarning,
  deleteWarning,
  listWarnings,
  updateWarning,
  type CombatWarning,
  type WarningSeverity,
} from "@/lib/comite-combat-warnings";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

const fieldClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

const SEVERITIES: { key: WarningSeverity; label: string }[] = [
  { key: "avertissement", label: "Avertissement" },
  { key: "expulsion", label: "Expulsion" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function WarningRow({
  warning,
  canWrite,
  onChange,
  onCommit,
  onSeverityChange,
  onRemove,
}: {
  warning: CombatWarning;
  canWrite: boolean;
  onChange: (id: string, fields: Partial<CombatWarning>) => void;
  onCommit: (id: string) => void;
  onSeverityChange: (id: string, severity: WarningSeverity) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/[.06] p-3 dark:border-white/[.06]">
      <div className="min-w-40 flex-1">
        <p className="font-medium text-foreground">
          {warning.player_name ?? warning.character_name}
        </p>
      </div>
      <select
        value={warning.severity}
        onChange={(e) =>
          onSeverityChange(warning.id, e.target.value as WarningSeverity)
        }
        disabled={!canWrite}
        className={`${fieldClassName} disabled:opacity-60`}
      >
        {SEVERITIES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={warning.year}
        onChange={(e) => onChange(warning.id, { year: Number(e.target.value) })}
        onBlur={() => onCommit(warning.id)}
        placeholder="Année"
        title="Année"
        disabled={!canWrite}
        className={`w-20 ${fieldClassName} disabled:opacity-60`}
      />
      <input
        type="date"
        value={warning.activity_date ?? ""}
        onChange={(e) =>
          onChange(warning.id, { activity_date: e.target.value || null })
        }
        onBlur={() => onCommit(warning.id)}
        title="Date de l'activité"
        disabled={!canWrite}
        className={`${fieldClassName} disabled:opacity-60`}
      />
      <input
        type="text"
        value={warning.reason}
        onChange={(e) => onChange(warning.id, { reason: e.target.value })}
        onBlur={() => onCommit(warning.id)}
        placeholder="Motif"
        disabled={!canWrite}
        className={`min-w-48 flex-1 ${fieldClassName} disabled:opacity-60`}
      />
      <input
        type="text"
        value={warning.issued_by}
        onChange={(e) => onChange(warning.id, { issued_by: e.target.value })}
        onBlur={() => onCommit(warning.id)}
        placeholder="Arbitre"
        disabled={!canWrite}
        className={`w-40 ${fieldClassName} disabled:opacity-60`}
      />
      <span
        className="w-36 text-xs text-foreground/50"
        title="Date d'ajout au registre"
      >
        {formatDate(warning.created_at)}
      </span>
      {canWrite && (
        <button
          type="button"
          onClick={() => onRemove(warning.id)}
          aria-label="Supprimer"
          className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] hover:text-red-600 dark:hover:bg-white/[.08]"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function ComiteCombatAvertissementsContent() {
  const [warnings, setWarnings] = useState<CombatWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["comite-combat"] === "ecriture");
      });
    });
    listWarnings()
      .then(setWarnings)
      .finally(() => setIsLoading(false));
  }, []);

  const handleAdd = async (character: Character) => {
    const created = await createWarning(character.external_id);
    setWarnings((prev) => [created, ...prev]);
  };

  const handleChange = (id: string, fields: Partial<CombatWarning>) => {
    setWarnings((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...fields } : w)),
    );
  };

  const handleSeverityChange = async (
    id: string,
    severity: WarningSeverity,
  ) => {
    setWarnings((prev) =>
      prev.map((w) => (w.id === id ? { ...w, severity } : w)),
    );
    if (!canWrite) return;
    await updateWarning(id, { severity });
  };

  const persist = async (id: string) => {
    if (!canWrite) return;
    const w = warnings.find((w) => w.id === id);
    if (!w) return;
    await updateWarning(id, {
      reason: w.reason,
      severity: w.severity,
      issued_by: w.issued_by,
      year: w.year,
      activity_date: w.activity_date,
    });
  };

  const handleRemove = async (id: string) => {
    await deleteWarning(id);
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div>
      <Link
        href="/comite-combat"
        className="flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Comité Combat
      </Link>
      <h1 className={`${glofters.className} mt-2 text-3xl text-foreground`}>
        Avertissements
      </h1>
      <Breadcrumb />

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {canWrite && (
          <div className="mb-4 max-w-md">
            <CharacterSearch
              onSelect={handleAdd}
              placeholder="Rechercher un personnage à avertir…"
            />
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {warnings.map((w) => (
              <WarningRow
                key={w.id}
                warning={w}
                canWrite={canWrite}
                onChange={handleChange}
                onCommit={persist}
                onSeverityChange={handleSeverityChange}
                onRemove={handleRemove}
              />
            ))}
            {warnings.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucun avertissement pour l&apos;instant.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComiteCombatAvertissementsPage() {
  return (
    <RequireFeature feature="comite-combat">
      <ComiteCombatAvertissementsContent />
    </RequireFeature>
  );
}
