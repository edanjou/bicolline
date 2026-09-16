"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import EvenementsTabs from "@/components/evenements-tabs";
import { Pagination, usePagination } from "@/components/pagination";
import RequireFeature from "@/components/require-feature";
import {
  listBicollineEvents,
  type BicollineEvent,
} from "@/lib/bicolline-events";

const inputClassName =
  "w-64 rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const rowClassName =
  "border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EvenementsListeContent() {
  const [events, setEvents] = useState<BicollineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listBicollineEvents()
      .then(setEvents)
      .catch(() => setError("Impossible de charger les évènements."))
      .finally(() => setIsLoading(false));
  }, []);

  const filterQuery = query.toLowerCase();
  const visible = events.filter(
    (e) =>
      e.name.toLowerCase().includes(filterQuery) ||
      (e.category ?? "").toLowerCase().includes(filterQuery),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible, 30);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Évènements
      </h1>
      <Breadcrumb />
      <EvenementsTabs />

      {isLoading && (
        <p className="mt-8 text-sm text-foreground/60">Chargement…</p>
      )}
      {error && (
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!isLoading && !error && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un évènement…"
                className={inputClassName}
              />
            </div>
            <span className="text-sm text-foreground/60">
              {visible.length} / {events.length} évènements
            </span>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                <tr className="text-foreground/60">
                  <th className="px-4 py-3 font-medium">Évènement</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">
                    Inscriptions ouvertes
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Inscriptions fermées
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((e) => (
                  <tr key={e.external_id} className={rowClassName}>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {e.name}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/80">
                      {e.category ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/80">
                      {formatDate(e.start_date)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/80">
                      {formatDateTime(e.registration_start_date)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground/80">
                      {formatDateTime(e.registration_end_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pageItems.length === 0 && (
              <p className="px-4 py-6 text-sm text-foreground/60">
                Aucun évènement pour l&apos;instant. Synchronisez depuis
                Paramètres.
              </p>
            )}
          </div>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

export default function EvenementsListePage() {
  return (
    <RequireFeature feature="evenements">
      <EvenementsListeContent />
    </RequireFeature>
  );
}
