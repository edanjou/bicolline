"use client";

import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AVAILABILITY_ANSWERS,
  formatSlotDate,
  formatSlotTime,
  type AvailabilityAnswer,
} from "@/lib/availability-polls";

type PublicPoll = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  is_open: boolean;
};

type PublicSlot = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
};

const ANSWER_STYLES: Record<AvailabilityAnswer, string> = {
  yes: "border-green-600 bg-green-600 text-white",
  maybe: "border-amber-500 bg-amber-500 text-white",
  no: "border-zinc-500 bg-zinc-500 text-white",
};

const inputClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

export default function SondagePage() {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<PublicPoll | null>(null);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [answers, setAnswers] = useState<Record<string, AvailabilityAnswer>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/disponibilites/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Sondage introuvable.");
        setPoll(data.poll);
        setSlots(data.slots ?? []);
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const slotsByDate = slots.reduce<Map<string, PublicSlot[]>>((acc, slot) => {
    acc.set(slot.date, [...(acc.get(slot.date) ?? []), slot]);
    return acc;
  }, new Map());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/disponibilites/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, comment, answers }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body.error ?? "Échec de l'envoi.");
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError("Échec de l'envoi. Vérifie ta connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8 font-sans">
      <div className="flex w-full max-w-xl flex-col gap-5">
        <Image
          src="/bicolline.svg"
          alt="Logo"
          width={100}
          height={100}
          priority
          className="h-[100px] w-[100px] self-center"
        />

        {isLoading && (
          <p className="text-center text-sm text-foreground/60">Chargement…</p>
        )}
        {loadError && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
        )}

        {poll && (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              {poll.title}
            </h1>
            {poll.location && (
              <p className="mt-1 text-sm text-foreground/60">{poll.location}</p>
            )}
            {poll.description && (
              <p className="mt-3 whitespace-pre-line text-sm text-foreground/80">
                {poll.description}
              </p>
            )}
          </div>
        )}

        {poll && !poll.is_open && (
          <p className="rounded-2xl border border-black/[.08] bg-white p-6 text-center text-sm text-foreground/70 dark:border-white/[.145] dark:bg-zinc-900">
            Ce sondage est fermé et n&apos;accepte plus de réponses.
          </p>
        )}

        {poll && poll.is_open && success && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[.08] bg-white p-6 text-center dark:border-white/[.145] dark:bg-zinc-900">
            <CheckCircle2
              size={40}
              className="text-green-600 dark:text-green-400"
            />
            <p className="font-medium text-foreground">
              Merci, tes disponibilités sont enregistrées !
            </p>
            <p className="text-sm text-foreground/60">
              Pour les modifier, remplis à nouveau le formulaire avec le même
              courriel.
            </p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="mt-2 text-sm text-primary underline-offset-2 hover:underline"
            >
              Modifier mes réponses
            </button>
          </div>
        )}

        {poll && poll.is_open && !success && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-900"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom"
                autoComplete="name"
                className={inputClassName}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Courriel"
                autoComplete="email"
                className={inputClassName}
              />
            </div>

            <p className="text-sm text-foreground/60">
              Indique ta disponibilité pour chaque plage. Une plage sans réponse
              compte comme « Non ».
            </p>

            {slots.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune plage horaire pour l&apos;instant.
              </p>
            )}

            {[...slotsByDate.entries()].map(([date, dateSlots]) => (
              <div key={date} className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold capitalize text-foreground">
                  {formatSlotDate(date)}
                </h2>
                {dateSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[.06] px-3 py-2 dark:border-white/[.08]"
                  >
                    <span className="text-sm text-foreground">
                      {formatSlotTime(slot)}
                    </span>
                    <div
                      role="radiogroup"
                      aria-label={`${formatSlotDate(date)} ${formatSlotTime(slot)}`}
                      className="flex gap-1"
                    >
                      {AVAILABILITY_ANSWERS.map((a) => {
                        const selected = answers[slot.id] === a.value;
                        return (
                          <button
                            key={a.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [slot.id]: a.value,
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              selected
                                ? ANSWER_STYLES[a.value]
                                : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                            }`}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire (facultatif)"
              rows={3}
              className={inputClassName}
            />

            {submitError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || slots.length === 0}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Envoi…" : "Envoyer mes disponibilités"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
