"use client";

import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import EvenementsTabs from "@/components/evenements-tabs";
import RequireFeature from "@/components/require-feature";
import {
  listBicollineEventOptions,
  listBicollineEvents,
  type BicollineEvent,
  type BicollineEventOption,
} from "@/lib/bicolline-events";

const rowClassName =
  "border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]";

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

function EvenementsAdmissionsContent() {
  const [events, setEvents] = useState<BicollineEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [options, setOptions] = useState<BicollineEventOption[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBicollineEvents()
      .then((list) => {
        setEvents(list);
        if (list.length > 0) setSelectedEventId(list[0].external_id);
      })
      .catch(() => setError("Impossible de charger les évènements."))
      .finally(() => setIsLoadingEvents(false));
  }, []);

  useEffect(() => {
    if (selectedEventId === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sets a loading flag ahead of an async fetch
    setIsLoadingOptions(true);
    listBicollineEventOptions(selectedEventId)
      .then(setOptions)
      .catch(() => setError("Impossible de charger les admissions."))
      .finally(() => setIsLoadingOptions(false));
  }, [selectedEventId]);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Admission
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
          <div className="mb-4 flex items-center gap-3">
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
            {!isLoadingOptions && (
              <span className="text-sm text-foreground/60">
                {options.length} guilde{options.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {isLoadingOptions ? (
            <p className="text-sm text-foreground/60">Chargement…</p>
          ) : (
            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                  <tr className="text-foreground/60">
                    <th className="px-4 py-3 font-medium">Guilde</th>
                    <th className="px-4 py-3 text-center font-medium">
                      Limite
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Limite VIP
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      VIP cessionnaires
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      VIP membres
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((o) => (
                    <tr key={o.external_id} className={rowClassName}>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {o.guild_name}
                      </td>
                      <td className="px-4 py-2.5 text-center text-foreground/80">
                        {o.admission_limit ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center text-foreground/80">
                        {o.vip_limit ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <BooleanDot value={o.vip_for_cessionaries} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <BooleanDot value={o.vip_for_members} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <BooleanDot value={o.is_active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {options.length === 0 && (
                <p className="px-4 py-6 text-sm text-foreground/60">
                  Aucune admission pour cet évènement.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EvenementsAdmissionsPage() {
  return (
    <RequireFeature feature="evenements">
      <EvenementsAdmissionsContent />
    </RequireFeature>
  );
}
