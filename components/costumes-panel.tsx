"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  COSTUME_SEXES,
  COSTUME_STATUSES,
  createCostume,
  deleteCostume,
  listCostumes,
  updateCostume,
  type CostumeItem,
  type CostumeItemInput,
  type CostumeSex,
  type CostumeStatus,
} from "@/lib/costumes";
import {
  listEventCoordinations,
  type EventCoordination,
} from "@/lib/event-coordinations";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

const cellInputClassName =
  "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-foreground hover:border-black/[.08] focus:border-black/[.15] focus:bg-white focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] dark:focus:bg-zinc-800";

const STATUS_STYLES: Record<CostumeStatus, string> = {
  "En évaluation":
    "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400",
  "En stock":
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-400",
  "À acheter": "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400",
  "À réparer/modifier":
    "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400",
  "Préparé":
    "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
  Autre: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300",
  "N/A": "bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400",
};

function statusSelectClassName(status: CostumeStatus): string {
  return `rounded border border-transparent px-1 py-0.5 text-xs hover:border-black/[.08] focus:border-black/[.15] focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] ${STATUS_STYLES[status]}`;
}

const EMPTY_FORM: CostumeItemInput = {
  description: "",
  quantity: "",
  status: "En évaluation",
  sex: "N/A",
  size: "",
  materials: "",
  deadline: "",
  storage_location: "",
  required_location: "",
  needed_date: null,
  requested_by: "",
  event_coordination_id: null,
  sub_team: "",
};

function toFormState(c: CostumeItem): CostumeItemInput {
  return {
    description: c.description,
    quantity: c.quantity,
    status: c.status,
    sex: c.sex,
    size: c.size,
    materials: c.materials,
    deadline: c.deadline,
    storage_location: c.storage_location,
    required_location: c.required_location,
    needed_date: c.needed_date,
    requested_by: c.requested_by,
    event_coordination_id: c.event_coordination_id,
    sub_team: c.sub_team,
  };
}

export default function CostumesPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [items, setItems] = useState<CostumeItem[]>([]);
  const [eventCoordinations, setEventCoordinations] = useState<
    EventCoordination[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    const [i, c] = await Promise.all([
      listCostumes(coordinationKey),
      listEventCoordinations(),
    ]);
    setItems(i);
    setEventCoordinations(c);
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
      const created = await createCostume(coordinationKey, EMPTY_FORM);
      setItems((prev) => [created, ...prev]);
    } catch {
      alert("Échec de la création.");
    }
  };

  const handleFieldChange = <K extends keyof CostumeItemInput>(
    item: CostumeItem,
    field: K,
    value: CostumeItemInput[K],
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, [field]: value } : i)),
    );
  };

  const handleFieldSave = async (itemId: string) => {
    if (!canWrite) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    try {
      await updateCostume(item.id, toFormState(item));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleImmediateChange = async <K extends keyof CostumeItemInput>(
    item: CostumeItem,
    field: K,
    value: CostumeItemInput[K],
  ) => {
    const updated = { ...item, [field]: value };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    if (!canWrite) return;
    try {
      await updateCostume(item.id, toFormState(updated));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (item: CostumeItem) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer « ${item.description} » ?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteCostume(item.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  if (isLoading) return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground/60">
          {items.length} item{items.length > 1 ? "s" : ""}
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Ajouter une ligne
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-foreground/60">Aucun item pour l&apos;instant.</p>
      )}

      {items.length > 0 && (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
              <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                <th className="px-2 py-2 font-medium">Description de l&apos;item</th>
                <th className="px-2 py-2 font-medium">Quantité</th>
                <th className="px-2 py-2 font-medium">Statut</th>
                <th className="px-2 py-2 font-medium">Sexe</th>
                <th className="px-2 py-2 font-medium">Grandeur</th>
                <th className="px-2 py-2 font-medium">Matériaux</th>
                <th className="px-2 py-2 font-medium">Échéancier</th>
                <th className="px-2 py-2 font-medium">Lieu d&apos;entreposage</th>
                <th className="px-2 py-2 font-medium">Emplacement requis</th>
                <th className="px-2 py-2 font-medium">Moment requis</th>
                <th className="px-2 py-2 font-medium">Demandé par</th>
                <th className="px-2 py-2 font-medium">Département / Coordination</th>
                <th className="px-2 py-2 font-medium">Sous-équipe / rôle</th>
                {canWrite && <th className="px-2 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-black/[.04] dark:border-white/[.06]"
                >
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.description}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(item, "description", e.target.value)
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-48 font-medium`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.quantity}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(item, "quantity", e.target.value)
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-16`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={item.status}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleImmediateChange(
                          item,
                          "status",
                          e.target.value as CostumeStatus,
                        )
                      }
                      className={statusSelectClassName(item.status)}
                    >
                      {COSTUME_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={item.sex}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleImmediateChange(
                          item,
                          "sex",
                          e.target.value as CostumeSex,
                        )
                      }
                      className={cellInputClassName}
                    >
                      {COSTUME_SEXES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.size}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(item, "size", e.target.value)
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-16`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.materials}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(item, "materials", e.target.value)
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.deadline}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(item, "deadline", e.target.value)
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.storage_location}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(
                          item,
                          "storage_location",
                          e.target.value,
                        )
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.required_location}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(
                          item,
                          "required_location",
                          e.target.value,
                        )
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={item.needed_date ?? ""}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleImmediateChange(
                          item,
                          "needed_date",
                          e.target.value || null,
                        )
                      }
                      className={`${cellInputClassName} w-32`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.requested_by}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(
                          item,
                          "requested_by",
                          e.target.value,
                        )
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={item.event_coordination_id ?? ""}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleImmediateChange(
                          item,
                          "event_coordination_id",
                          e.target.value || null,
                        )
                      }
                      className={cellInputClassName}
                    >
                      <option value="">—</option>
                      {eventCoordinations.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.sub_team}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(item, "sub_team", e.target.value)
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-28`}
                    />
                  </td>
                  {canWrite && (
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
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
    </div>
  );
}
