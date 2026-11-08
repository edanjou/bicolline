"use client";

import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import {
  createPoll,
  deletePoll,
  deleteResponse,
  formatSlotDate,
  formatSlotTime,
  getPollDetails,
  listPolls,
  setPollOpen,
  sortSlots,
  updatePoll,
  type AvailabilityAnswer,
  type AvailabilityPoll,
  type AvailabilityPollSummary,
  type AvailabilityResponse,
  type AvailabilitySlot,
  type SlotDraft,
} from "@/lib/availability-polls";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const secondaryButtonClassName =
  "flex items-center gap-2 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]";
const primaryButtonClassName =
  "flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60";
const iconButtonClassName =
  "rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] hover:text-foreground dark:hover:bg-white/[.08]";
const rowClassName =
  "border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]";

const ANSWER_CELL: Record<
  AvailabilityAnswer,
  { label: string; className: string }
> = {
  yes: {
    label: "Oui",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  maybe: {
    label: "Si néc.",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  no: {
    label: "Non",
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

function publicUrl(pollId: string): string {
  return `${window.location.origin}/sondage/${pollId}`;
}

function CopyLinkButton({ pollId }: { pollId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(publicUrl(pollId));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={secondaryButtonClassName}
    >
      <Copy size={16} />
      {copied ? "Lien copié" : "Copier le lien public"}
    </button>
  );
}

function PollModal({
  initial,
  initialSlots,
  onClose,
  onSaved,
}: {
  initial?: AvailabilityPoll;
  initialSlots?: AvailabilitySlot[];
  onClose: () => void;
  onSaved: (pollId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [slots, setSlots] = useState<SlotDraft[]>(
    initialSlots?.map((s) => ({
      id: s.id,
      date: s.date,
      start_time: s.start_time?.slice(0, 5) ?? "",
      end_time: s.end_time?.slice(0, 5) ?? "",
    })) ?? [{ date: "", start_time: "19:00", end_time: "21:00" }],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSlot = (index: number, attrs: Partial<SlotDraft>) =>
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...attrs } : s)),
    );

  // Nouvelle plage : mêmes heures que la dernière, le lendemain.
  const addSlot = () =>
    setSlots((prev) => {
      const last = prev[prev.length - 1];
      if (!last?.date)
        return [
          ...prev,
          {
            date: "",
            start_time: last?.start_time ?? "",
            end_time: last?.end_time ?? "",
          },
        ];
      const [y, m, d] = last.date.split("-").map(Number);
      const next = new Date(y, m - 1, d + 1);
      const date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      return [
        ...prev,
        { date, start_time: last.start_time, end_time: last.end_time },
      ];
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSlots = slots.filter((s) => s.date);
    if (validSlots.length === 0) {
      setError("Ajoute au moins une plage avec une date.");
      return;
    }
    if (
      validSlots.some(
        (s) => s.start_time && s.end_time && s.end_time <= s.start_time,
      )
    ) {
      setError("L'heure de fin doit suivre l'heure de début.");
      return;
    }
    const removedWithAnswers =
      initialSlots?.some((s) => !validSlots.some((v) => v.id === s.id)) ??
      false;
    if (
      removedWithAnswers &&
      !window.confirm(
        "Les plages retirées seront supprimées avec leurs réponses. Continuer ?",
      )
    )
      return;

    setError(null);
    setIsSaving(true);
    const input = {
      title: title.trim(),
      location: location.trim() || null,
      description: description.trim() || null,
    };
    try {
      const pollId = initial
        ? (await updatePoll(initial.id, input, validSlots), initial.id)
        : await createPoll(input, validSlots);
      await onSaved(pollId);
      onClose();
    } catch {
      setError("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">
          {initial ? "Modifier le sondage" : "Nouveau sondage"}
        </h2>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre (ex. Rencontre des maréchaux)"
          className={inputClassName}
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Lieu ou lien de visioconférence (facultatif)"
          className={inputClassName}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description affichée sur le formulaire (facultatif)"
          rows={3}
          className={inputClassName}
        />

        <div className="mt-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Plages horaires ({slots.length})
          </h3>
          <span className="text-xs text-foreground/50">
            Heures vides : toute la journée
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {slots.map((slot, index) => (
            <div
              key={slot.id ?? `new-${index}`}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="date"
                value={slot.date}
                onChange={(e) => updateSlot(index, { date: e.target.value })}
                aria-label="Date"
                className={inputClassName}
              />
              <input
                type="time"
                value={slot.start_time}
                onChange={(e) =>
                  updateSlot(index, { start_time: e.target.value })
                }
                aria-label="Début"
                className={inputClassName}
              />
              <span className="text-foreground/50">–</span>
              <input
                type="time"
                value={slot.end_time}
                onChange={(e) =>
                  updateSlot(index, { end_time: e.target.value })
                }
                aria-label="Fin"
                className={inputClassName}
              />
              <button
                type="button"
                onClick={() =>
                  setSlots((prev) => [
                    ...prev.slice(0, index + 1),
                    { ...slot, id: undefined },
                    ...prev.slice(index + 1),
                  ])
                }
                aria-label="Dupliquer la plage"
                title="Dupliquer"
                className={iconButtonClassName}
              >
                <Copy size={16} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setSlots((prev) => prev.filter((_, i) => i !== index))
                }
                aria-label="Retirer la plage"
                title="Retirer"
                className={iconButtonClassName}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSlot}
          className={`${secondaryButtonClassName} self-start`}
        >
          <Plus size={16} />
          Ajouter une plage
        </button>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClassName}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={primaryButtonClassName}
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function slotScore(slotId: string, responses: AvailabilityResponse[]) {
  let yes = 0;
  let maybe = 0;
  for (const r of responses) {
    if (r.answers[slotId] === "yes") yes++;
    else if (r.answers[slotId] === "maybe") maybe++;
  }
  return { yes, maybe };
}

function PollDetails({
  pollId,
  canWrite,
  onBack,
  onChanged,
}: {
  pollId: string;
  canWrite: boolean;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [details, setDetails] = useState<Awaited<
    ReturnType<typeof getPollDetails>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);

  const load = () =>
    getPollDetails(pollId)
      .then(setDetails)
      .catch(() => setError("Impossible de charger le sondage."));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the poll changes
  }, [pollId]);

  if (error)
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!details)
    return <p className="text-sm text-foreground/60">Chargement…</p>;

  const { poll, slots, responses } = details;
  const scores = new Map(slots.map((s) => [s.id, slotScore(s.id, responses)]));
  // Meilleure plage : le plus de « oui », puis le plus de « si nécessaire ».
  const best = slots.reduce<{ yes: number; maybe: number } | null>((acc, s) => {
    const score = scores.get(s.id)!;
    if (
      !acc ||
      score.yes > acc.yes ||
      (score.yes === acc.yes && score.maybe > acc.maybe)
    )
      return score;
    return acc;
  }, null);
  const isBest = (slotId: string) => {
    const score = scores.get(slotId)!;
    return Boolean(
      best &&
      best.yes + best.maybe > 0 &&
      score.yes === best.yes &&
      score.maybe === best.maybe,
    );
  };
  const ranking = [...slots].sort((a, b) => {
    const sa = scores.get(a.id)!;
    const sb = scores.get(b.id)!;
    return sb.yes - sa.yes || sb.maybe - sa.maybe;
  });

  const handleToggleOpen = async () => {
    await setPollOpen(poll.id, !poll.is_open);
    await load();
    await onChanged();
  };

  const handleDeletePoll = async () => {
    if (
      !window.confirm(
        `Supprimer le sondage « ${poll.title} » et toutes ses réponses ?`,
      )
    )
      return;
    await deletePoll(poll.id);
    await onChanged();
    onBack();
  };

  const handleDeleteResponse = async (response: AvailabilityResponse) => {
    if (!window.confirm(`Supprimer la réponse de ${response.name} ?`)) return;
    await deleteResponse(response.id);
    await load();
    await onChanged();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Tous les sondages
          </button>
          <h2 className="text-xl font-semibold text-foreground">
            {poll.title}
          </h2>
          {poll.location && (
            <p className="text-sm text-foreground/60">{poll.location}</p>
          )}
          <p className="mt-1 text-sm text-foreground/60">
            {responses.length} réponse{responses.length > 1 ? "s" : ""} ·{" "}
            {poll.is_open ? "Ouvert" : "Fermé"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton pollId={poll.id} />
          <a
            href={`/sondage/${poll.id}`}
            target="_blank"
            rel="noreferrer"
            className={secondaryButtonClassName}
          >
            <ExternalLink size={16} />
            Voir le formulaire
          </a>
          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={secondaryButtonClassName}
              >
                <Pencil size={16} />
                Modifier
              </button>
              <button
                type="button"
                onClick={handleToggleOpen}
                className={secondaryButtonClassName}
              >
                {poll.is_open ? <Lock size={16} /> : <LockOpen size={16} />}
                {poll.is_open ? "Fermer" : "Rouvrir"}
              </button>
              <button
                type="button"
                onClick={handleDeletePoll}
                className={secondaryButtonClassName}
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Résumé</h3>
        {responses.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucune réponse pour l&apos;instant.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {ranking.map((slot) => {
              const score = scores.get(slot.id)!;
              const pct = Math.round(
                ((score.yes + score.maybe * 0.5) / responses.length) * 100,
              );
              return (
                <li key={slot.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={`w-64 shrink-0 capitalize ${isBest(slot.id) ? "font-semibold text-foreground" : "text-foreground/80"}`}
                  >
                    {formatSlotDate(slot.date)}, {formatSlotTime(slot)}
                  </span>
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.08]">
                    <span
                      className="absolute inset-y-0 left-0 bg-green-500"
                      style={{
                        width: `${(score.yes / responses.length) * 100}%`,
                      }}
                    />
                    <span
                      className="absolute inset-y-0 bg-amber-400"
                      style={{
                        left: `${(score.yes / responses.length) * 100}%`,
                        width: `${(score.maybe / responses.length) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-44 shrink-0 text-right text-foreground/70">
                    {score.yes} oui · {score.maybe} si néc.{" "}
                    <span className="text-foreground/40">({pct} %)</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Réponses</h3>
          {responses.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  responses.map((r) => r.email).join(", "),
                );
                setCopiedEmails(true);
                setTimeout(() => setCopiedEmails(false), 1500);
              }}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Copy size={14} />
              {copiedEmails ? "Courriels copiés" : "Copier les courriels"}
            </button>
          )}
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
              <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                <th className="py-2 pr-4 font-medium">Participant</th>
                {slots.map((slot) => (
                  <th
                    key={slot.id}
                    className={`px-2 py-2 text-center text-xs font-medium ${isBest(slot.id) ? "text-green-700 dark:text-green-400" : ""}`}
                  >
                    <span className="block capitalize">
                      {formatSlotDate(slot.date)}
                    </span>
                    <span className="block font-normal">
                      {formatSlotTime(slot)}
                    </span>
                  </th>
                ))}
                <th className="py-2 pl-2 font-medium">Commentaire</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.id} className={rowClassName}>
                  <td className="py-2 pr-4">
                    <span className="block text-foreground">{r.name}</span>
                    <span className="block text-xs text-foreground/50">
                      {r.email}
                    </span>
                  </td>
                  {slots.map((slot) => {
                    const answer = r.answers[slot.id];
                    return (
                      <td key={slot.id} className="px-2 py-2 text-center">
                        {answer ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ANSWER_CELL[answer].className}`}
                          >
                            {ANSWER_CELL[answer].label}
                          </span>
                        ) : (
                          <span className="text-xs text-foreground/30">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="max-w-xs py-2 pl-2 text-xs text-foreground/70">
                    {r.comment ?? ""}
                  </td>
                  {canWrite && (
                    <td className="py-2 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteResponse(r)}
                        aria-label="Supprimer la réponse"
                        className={iconButtonClassName}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {responses.length > 0 && (
                <tr className="border-t border-black/[.08] font-medium dark:border-white/[.08]">
                  <td className="py-2 pr-4 text-foreground">Total</td>
                  {slots.map((slot) => {
                    const score = scores.get(slot.id)!;
                    return (
                      <td
                        key={slot.id}
                        className={`px-2 py-2 text-center text-xs ${isBest(slot.id) ? "text-green-700 dark:text-green-400" : "text-foreground/80"}`}
                      >
                        {score.yes}
                        {score.maybe > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {" "}
                            (+{score.maybe})
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td />
                  {canWrite && <td />}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isEditing && (
        <PollModal
          initial={poll}
          initialSlots={sortSlots(slots)}
          onClose={() => setIsEditing(false)}
          onSaved={async () => {
            await load();
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function DisponibilitesContent() {
  const [polls, setPolls] = useState<AvailabilityPollSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

  const fetchPolls = () =>
    listPolls()
      .then(setPolls)
      .catch(() => setError("Impossible de charger les sondages."))
      .finally(() => setIsLoading(false));

  useEffect(() => {
    fetchPolls();
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) =>
        setCanWrite(levels["disponibilites"] === "ecriture"),
      );
    });
  }, []);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Disponibilités
      </h1>
      <Breadcrumb />

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {selectedPollId ? (
          <PollDetails
            pollId={selectedPollId}
            canWrite={canWrite}
            onBack={() => setSelectedPollId(null)}
            onChanged={fetchPolls}
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-foreground/60">
                Chaque sondage a un lien public où les gens indiquent leurs
                disponibilités.
              </p>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className={primaryButtonClassName}
                >
                  <Plus size={16} />
                  Nouveau sondage
                </button>
              )}
            </div>
            {isLoading ? (
              <p className="text-sm text-foreground/60">Chargement…</p>
            ) : error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : polls.length === 0 ? (
              <p className="text-sm text-foreground/60">
                Aucun sondage pour l&apos;instant.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                    <th className="py-2 pr-4 font-medium">Sondage</th>
                    <th className="py-2 pr-4 font-medium">Plages</th>
                    <th className="py-2 pr-4 font-medium">Réponses</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {polls.map((poll) => (
                    <tr key={poll.id} className={rowClassName}>
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={() => setSelectedPollId(poll.id)}
                          className="link-button text-left text-primary underline-offset-2 hover:underline"
                        >
                          {poll.title}
                        </button>
                      </td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {poll.slot_count}
                      </td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {poll.response_count}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            poll.is_open
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {poll.is_open ? "Ouvert" : "Fermé"}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <CopyLinkButton pollId={poll.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {isCreating && (
        <PollModal
          onClose={() => setIsCreating(false)}
          onSaved={async (pollId) => {
            await fetchPolls();
            setSelectedPollId(pollId);
          }}
        />
      )}
    </div>
  );
}

export default function DisponibilitesPage() {
  return (
    <RequireFeature feature="disponibilites">
      <DisponibilitesContent />
    </RequireFeature>
  );
}
