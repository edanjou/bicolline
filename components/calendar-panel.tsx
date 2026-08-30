"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Table2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CALENDAR_ENTRY_TYPES,
  createCalendarEntry,
  deleteCalendarEntry,
  listCalendarEntries,
  updateCalendarEntry,
  type CalendarEntry,
  type CalendarEntryInput,
  type CalendarEntryType,
} from "@/lib/calendar-entries";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const cellInputClassName =
  "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-foreground hover:border-black/[.08] focus:border-black/[.15] focus:bg-white focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] dark:focus:bg-zinc-800";

const TYPE_STYLES: Record<CalendarEntryType, string> = {
  "Duché": "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400",
  Livrables:
    "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400",
  Publications:
    "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400",
  Rencontres:
    "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
};

function typeSelectClassName(type: CalendarEntryType): string {
  return `rounded border border-transparent px-1 py-0.5 text-xs hover:border-black/[.08] focus:border-black/[.15] focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] ${TYPE_STYLES[type]}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: CalendarEntryInput = {
  title: "",
  start_date: todayIso(),
  end_date: todayIso(),
  type: "Duché",
  location: "",
  description: "",
};

function toFormState(e: CalendarEntry): CalendarEntryInput {
  return {
    title: e.title,
    start_date: e.start_date,
    end_date: e.end_date,
    type: e.type,
    location: e.location,
    description: e.description,
  };
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthGrid(monthCursor: Date): Date[] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(year, month, 1 - startWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i,
      ),
    );
  }
  return days;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type ViewMode = "table" | "calendar";

const VIEW_TABS: { key: ViewMode; label: string; icon: typeof Table2 }[] = [
  { key: "table", label: "Tableau", icon: Table2 },
  { key: "calendar", label: "Calendrier", icon: CalendarDays },
];

export default function CalendarPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CalendarEntryType | "">("");
  const [locationFilter, setLocationFilter] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const fetchAll = async () => {
    setIsLoading(true);
    setEntries(await listCalendarEntries(coordinationKey));
    setIsLoading(false);
  };

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels[moduleKey] === "ecriture");
      });
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAll/moduleKey stable for a given coordinationKey
  }, [coordinationKey]);

  const handleAddRow = async () => {
    if (!canWrite) return;
    try {
      const created = await createCalendarEntry(coordinationKey, EMPTY_FORM);
      setEntries((prev) => [created, ...prev]);
    } catch {
      alert("Échec de la création.");
    }
  };

  const handleFieldChange = <K extends keyof CalendarEntryInput>(
    entry: CalendarEntry,
    field: K,
    value: CalendarEntryInput[K],
  ) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, [field]: value } : e)),
    );
  };

  const handleFieldSave = async (entryId: string) => {
    if (!canWrite) return;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    try {
      await updateCalendarEntry(entry.id, toFormState(entry));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleImmediateChange = async <K extends keyof CalendarEntryInput>(
    entry: CalendarEntry,
    field: K,
    value: CalendarEntryInput[K],
  ) => {
    const updated = { ...entry, [field]: value };
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)));
    if (!canWrite) return;
    try {
      await updateCalendarEntry(entry.id, toFormState(updated));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (entry: CalendarEntry) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer « ${entry.title || "cette entrée"} » ?`))
      return;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    try {
      await deleteCalendarEntry(entry.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const q = search.trim().toLowerCase();
  const loc = locationFilter.trim().toLowerCase();
  const filtered = entries.filter(
    (e) =>
      (!typeFilter || e.type === typeFilter) &&
      (!loc || e.location.toLowerCase().includes(loc)) &&
      (!q ||
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)),
  );

  if (isLoading) return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {VIEW_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                view === t.key
                  ? "border-primary bg-primary text-white"
                  : "border-black/[.08] bg-white text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
        {view === "table" && canWrite && (
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Ajouter une entrée
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (titre, description)…"
          className={`${inputClassName} w-64`}
        />
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as CalendarEntryType | "")
          }
          className={inputClassName}
        >
          <option value="">Tous les types</option>
          {CALENDAR_ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          placeholder="Filtrer par lieu…"
          className={`${inputClassName} w-48`}
        />
        <span className="text-sm text-foreground/60">
          {filtered.length} / {entries.length} entrée
          {entries.length > 1 ? "s" : ""}
        </span>
      </div>

      {view === "table" ? (
        <>
          {filtered.length === 0 && (
            <p className="text-sm text-foreground/60">
              Aucune entrée pour l&apos;instant.
            </p>
          )}
          {filtered.length > 0 && (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                  <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                    <th className="px-2 py-2 font-medium">Titre</th>
                    <th className="px-2 py-2 font-medium">Date de début</th>
                    <th className="px-2 py-2 font-medium">Date de fin</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">Lieu</th>
                    <th className="px-2 py-2 font-medium">Description</th>
                    {canWrite && <th className="px-2 py-2 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-black/[.04] dark:border-white/[.06]"
                    >
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={entry.title}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleFieldChange(entry, "title", e.target.value)
                          }
                          onBlur={() => handleFieldSave(entry.id)}
                          className={`${cellInputClassName} w-40 font-medium`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={entry.start_date}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleImmediateChange(
                              entry,
                              "start_date",
                              e.target.value,
                            )
                          }
                          className={`${cellInputClassName} w-32`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={entry.end_date}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleImmediateChange(
                              entry,
                              "end_date",
                              e.target.value,
                            )
                          }
                          className={`${cellInputClassName} w-32`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={entry.type}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleImmediateChange(
                              entry,
                              "type",
                              e.target.value as CalendarEntryType,
                            )
                          }
                          className={typeSelectClassName(entry.type)}
                        >
                          {CALENDAR_ENTRY_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={entry.location}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleFieldChange(
                              entry,
                              "location",
                              e.target.value,
                            )
                          }
                          onBlur={() => handleFieldSave(entry.id)}
                          className={`${cellInputClassName} w-28`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={entry.description}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleFieldChange(
                              entry,
                              "description",
                              e.target.value,
                            )
                          }
                          onBlur={() => handleFieldSave(entry.id)}
                          className={`${cellInputClassName} w-56`}
                        />
                      </td>
                      {canWrite && (
                        <td className="px-2 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            aria-label="Supprimer"
                            className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setMonthCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
              aria-label="Mois précédent"
              className="rounded-full p-2 text-foreground/60 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="font-medium capitalize text-foreground">
              {monthCursor.toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              type="button"
              onClick={() =>
                setMonthCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
              aria-label="Mois suivant"
              className="rounded-full p-2 text-foreground/60 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-1 py-1 text-center text-xs font-medium text-foreground/50"
              >
                {label}
              </div>
            ))}
            {getMonthGrid(monthCursor).map((day) => {
              const iso = toIsoDate(day);
              const inMonth = day.getMonth() === monthCursor.getMonth();
              const dayEntries = filtered.filter(
                (e) => e.start_date <= iso && iso <= e.end_date,
              );
              return (
                <div
                  key={iso}
                  className={`flex min-h-[92px] flex-col gap-1 rounded-lg border border-black/[.06] p-1 dark:border-white/[.06] ${
                    inMonth ? "" : "opacity-40"
                  }`}
                >
                  <span className="text-[11px] text-foreground/50">
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayEntries.map((e) => (
                      <span
                        key={e.id}
                        title={`${e.title}${e.location ? " — " + e.location : ""}${e.description ? "\n" + e.description : ""}`}
                        className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${TYPE_STYLES[e.type]}`}
                      >
                        {e.title || "(sans titre)"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
