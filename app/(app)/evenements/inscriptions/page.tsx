"use client";

import { RefreshCw, Search, UtensilsCrossed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import EvenementsTabs from "@/components/evenements-tabs";
import RequireFeature from "@/components/require-feature";
import {
  listBicollineEventRegistrations,
  listBicollineEvents,
  summarizeEventMeals,
  type BicollineEvent,
  type BicollineEventRegistration,
} from "@/lib/bicolline-events";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

const inputClassName =
  "w-64 rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const rowClassName =
  "border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]";

function MealStatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/[.08] bg-black/[.02] p-3 dark:border-white/[.145] dark:bg-white/[.03]">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UtensilsCrossed size={16} />
      </span>
      <div>
        <p className="text-lg font-semibold leading-none text-foreground">
          {value}
        </p>
        <p className="text-xs text-foreground/60">{label}</p>
      </div>
    </div>
  );
}

function BooleanDot({ value }: { value: boolean }) {
  return (
    <span
      role="img"
      aria-label={value ? "Oui" : "Non"}
      title={value ? "Oui" : "Non"}
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        value ? "bg-green-500" : "bg-red-500"
      }`}
    />
  );
}

// Seuls les évènements 2026+ ont leurs inscriptions synchronisées.
const MIN_EVENT_YEAR = 2026;

function EvenementsInscriptionsContent() {
  const [events, setEvents] = useState<BicollineEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [registrations, setRegistrations] = useState<
    BicollineEventRegistration[]
  >([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedFront, setSelectedFront] = useState("");
  const [excludeUnpaid, setExcludeUnpaid] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      setIsAdmin(profile?.role === "admin");
    });
  }, []);

  useEffect(() => {
    listBicollineEvents()
      .then((list) => {
        const upcoming = list.filter((e) => {
          if (!e.start_date) return false;
          return new Date(e.start_date).getFullYear() >= MIN_EVENT_YEAR;
        });
        setEvents(upcoming);
        if (upcoming.length > 0) setSelectedEventId(upcoming[0].external_id);
      })
      .catch(() => setError("Impossible de charger les évènements."))
      .finally(() => setIsLoadingEvents(false));
  }, []);

  useEffect(() => {
    if (selectedEventId === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sets a loading flag ahead of an async fetch
    setIsLoadingRegistrations(true);
    setSelectedFront("");
    setExcludeUnpaid(true);
    setSyncMessage(null);
    listBicollineEventRegistrations(selectedEventId)
      .then(setRegistrations)
      .catch(() => setError("Impossible de charger les inscriptions."))
      .finally(() => setIsLoadingRegistrations(false));
  }, [selectedEventId]);

  const handleSync = async () => {
    if (selectedEventId === null) return;
    setError(null);
    setSyncMessage(null);
    setIsSyncing(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/admin/sync-single-event-registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventExternalId: selectedEventId }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Échec de la synchronisation.");
        return;
      }
      const refreshed = await listBicollineEventRegistrations(selectedEventId);
      setRegistrations(refreshed);
      setSyncMessage(`${body.registrationsSynced} inscriptions synchronisées.`);
    } catch {
      setError("Échec de la synchronisation.");
    } finally {
      setIsSyncing(false);
    }
  };

  // "Front" isn't its own field — for front-organized events it's embedded
  // in the admission label itself (e.g. "Front 3 (Cordélians)",
  // "Von Shlaffenmark (Jaune)"), so the filter options are just whatever
  // admission labels this event actually uses.
  const fronts = Array.from(
    new Set(
      registrations
        .map((r) => r.admission_name)
        .filter((name): name is string => Boolean(name)),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const unpaidCount = registrations.filter((r) => r.has_unpaid_balance).length;

  const filterQuery = query.toLowerCase();
  const visible = registrations.filter((r) => {
    if (selectedFront && r.admission_name !== selectedFront) return false;
    if (excludeUnpaid && r.has_unpaid_balance) return false;
    return `${r.first_name ?? ""} ${r.last_name ?? ""} ${r.user_email ?? ""}`
      .toLowerCase()
      .includes(filterQuery);
  });
  const mealSummary = useMemo(() => summarizeEventMeals(visible), [visible]);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Inscriptions
      </h1>
      <Breadcrumb />
      <EvenementsTabs />

      {isLoadingEvents && (
        <p className="mt-8 text-sm text-foreground/60">Chargement…</p>
      )}
      {error && (
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!isLoadingEvents && !error && (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-foreground/70">Évènement</label>
              <select
                value={selectedEventId ?? ""}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
              >
                {events.map((e) => (
                  <option key={e.external_id} value={e.external_id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <label className="text-sm text-foreground/70">Front</label>
              <select
                value={selectedFront}
                onChange={(e) => setSelectedFront(e.target.value)}
                className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
              >
                <option value="">Tous</option>
                {fronts.map((front) => (
                  <option key={front} value={front}>
                    {front}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un inscrit…"
                  className={inputClassName}
                />
              </div>
              <label className="flex items-center gap-1.5 text-sm text-foreground/70">
                <input
                  type="checkbox"
                  checked={excludeUnpaid}
                  onChange={(e) => setExcludeUnpaid(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Retirer les soldes impayés
              </label>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing || selectedEventId === null}
                  className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-white/[.08]"
                >
                  <RefreshCw
                    size={14}
                    className={isSyncing ? "animate-spin" : undefined}
                  />
                  {isSyncing ? "Synchronisation…" : "Synchroniser"}
                </button>
              )}
            </div>
            {!isLoadingRegistrations && (
              <span className="text-sm text-foreground/60">
                {visible.length} / {registrations.length} inscriptions
              </span>
            )}
          </div>

          {syncMessage && (
            <p className="mb-4 text-sm text-green-600 dark:text-green-400">
              {syncMessage}
            </p>
          )}

          {!isLoadingRegistrations && unpaidCount > 0 && (
            <p className="mb-4 text-sm font-medium text-red-600 dark:text-red-400">
              ⚠ {unpaidCount} inscription{unpaidCount > 1 ? "s" : ""} avec un
              solde impayé.
            </p>
          )}

          {events.length === 0 && (
            <p className="text-sm text-foreground/60">
              Aucun évènement {MIN_EVENT_YEAR}+ synchronisé pour l&apos;instant.
            </p>
          )}

          {events.length > 0 && !isLoadingRegistrations && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MealStatBox
                label="Dîners réguliers"
                value={mealSummary.dinerRegulier}
              />
              <MealStatBox
                label="Dîners végétariens"
                value={mealSummary.dinerVegetarien}
              />
              <MealStatBox
                label="Soupers réguliers"
                value={mealSummary.souperRegulier}
              />
              <MealStatBox
                label="Soupers végétariens"
                value={mealSummary.souperVegetarien}
              />
            </div>
          )}

          {events.length > 0 &&
            (isLoadingRegistrations ? (
              <p className="text-sm text-foreground/60">Chargement…</p>
            ) : (
              <div className="max-h-[70vh] overflow-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                    <tr className="text-foreground/60">
                      <th className="px-4 py-3 font-medium">Prénom</th>
                      <th className="px-4 py-3 font-medium">Nom</th>
                      <th className="px-4 py-3 font-medium">Admission</th>
                      <th className="px-4 py-3 font-medium">Repas</th>
                      <th className="px-4 py-3 font-medium">Courriel</th>
                      <th className="px-4 py-3 text-center font-medium">
                        Membre
                      </th>
                      <th className="px-4 py-3 text-center font-medium">
                        Participant additionnel
                      </th>
                      <th className="px-4 py-3 text-center font-medium">
                        Présent
                      </th>
                      <th className="px-4 py-3 text-center font-medium">
                        Solde impayé
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.external_id} className={rowClassName}>
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {r.first_name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-foreground/80">
                          {r.last_name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-foreground/80">
                          {r.admission_name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-foreground/80">
                          {r.have_options ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-foreground/80">
                          {r.user_email ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <BooleanDot value={r.is_member_when_registered} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <BooleanDot value={r.is_additional_participant} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <BooleanDot value={r.is_present} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {r.has_unpaid_balance ? (
                            <span className="font-medium text-red-600 dark:text-red-400">
                              Impayé
                            </span>
                          ) : (
                            <span className="text-foreground/40">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visible.length === 0 && (
                  <p className="px-4 py-6 text-sm text-foreground/60">
                    Aucune inscription pour cet évènement.
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function EvenementsInscriptionsPage() {
  return (
    <RequireFeature feature="evenements">
      <EvenementsInscriptionsContent />
    </RequireFeature>
  );
}
