"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Pagination, usePagination } from "@/components/pagination";
import {
  formatCoordinates,
  formatUnits,
  getGameSnapshot,
  sumUnits,
  type GameEndpoint,
  type GameSnapshot,
} from "@/lib/game-data";
import { decodeHtmlEntities } from "@/lib/text";

const inputClassName =
  "w-64 rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const selectClassName =
  "rounded-full border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const rowClassName =
  "border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]";
const thClassName = "py-2 pr-4 font-medium";
const tdClassName = "py-2 pr-4 text-foreground/80";
const linkClassName =
  "link-button text-left text-primary underline-offset-2 hover:underline";

export function useGameSnapshot<E extends GameEndpoint>(endpoint: E) {
  const [snapshot, setSnapshot] = useState<GameSnapshot<E> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGameSnapshot(endpoint)
      .then(setSnapshot)
      .catch(() => setError("Impossible de charger les données du jeu."))
      .finally(() => setIsLoading(false));
  }, [endpoint]);

  return { snapshot, isLoading, error };
}

export function text(value: string | null | undefined): string {
  return value ? decodeHtmlEntities(value) : "";
}

function matches(
  query: string,
  ...values: (string | number | null | undefined)[]
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) =>
    text(v == null ? "" : String(v))
      .toLowerCase()
      .includes(q),
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );
}

export function SyncedAt({ syncedAt }: { syncedAt: string }) {
  return (
    <p className="mt-3 text-xs text-foreground/50">
      Données de bicolline.online au{" "}
      {new Date(syncedAt).toLocaleString("fr-CA", {
        dateStyle: "long",
        timeStyle: "short",
      })}
      .
    </p>
  );
}

export function SnapshotStatus({
  isLoading,
  error,
  hasData,
}: {
  isLoading: boolean;
  error: string | null;
  hasData: boolean;
}) {
  if (isLoading)
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  if (error)
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!hasData)
    return (
      <p className="text-sm text-foreground/60">
        Aucune donnée pour l&apos;instant. Lancer la synchronisation de
        l&apos;état du jeu dans Paramètres.
      </p>
    );
  return null;
}

export function DetailModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-sm text-foreground/60">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-semibold text-foreground">{title}</h3>
      <div className="text-sm text-foreground/80">{children}</div>
    </section>
  );
}

export function DetailGrid({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-foreground/50">{label}</dt>
          <dd className="text-foreground">
            {value === "" || value == null ? "—" : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PublicNote({ note }: { note: string | null }) {
  if (!note?.trim()) return null;
  return (
    <DetailSection title="Historique">
      <p className="whitespace-pre-line rounded-lg bg-black/[.03] p-3 text-xs leading-relaxed dark:bg-white/[.04]">
        {text(note).trim()}
      </p>
    </DetailSection>
  );
}

function GuildLink({
  name,
  onGuildClick,
}: {
  name: string | null | undefined;
  onGuildClick: (name: string) => void;
}) {
  if (!name) return <>—</>;
  const label = text(name);
  return (
    <button
      type="button"
      onClick={() => onGuildClick(label)}
      className={linkClassName}
    >
      {label}
    </button>
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

// ---------- Croyances ----------

export function CroyancesTab({
  onCharacterClick,
}: {
  onCharacterClick: (name: string) => void;
}) {
  const { snapshot, isLoading, error } = useGameSnapshot("belief");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = Object.entries(snapshot?.data ?? {}).sort(([, a], [, b]) =>
    text(a.general.name).localeCompare(text(b.general.name), "fr"),
  );
  const visible = all.filter(([, b]) =>
    matches(
      query,
      b.general.name,
      b.doctrines.primary,
      b.doctrines.secondary,
      b.doctrines.tertiary,
      ...b.high_priests.map((p) => p.character),
    ),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);
  const selected = selectedId ? snapshot?.data[selectedId] : null;

  if (isLoading || error || !snapshot)
    return (
      <SnapshotStatus
        isLoading={isLoading}
        error={error}
        hasData={Boolean(snapshot)}
      />
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Croyance, doctrine, grand prêtre…"
        />
        <span className="text-sm text-foreground/60">
          {visible.length} / {all.length} croyances
        </span>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className={thClassName}>Nom</th>
              <th className={thClassName}>Fidèles</th>
              <th className={thClassName}>Doctrines</th>
              <th className={thClassName}>Dévotion</th>
              <th className={thClassName}>Grands prêtres</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(([id, b]) => (
              <tr key={id} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={linkClassName}
                  >
                    {text(b.general.name)}
                  </button>
                </td>
                <td className={tdClassName}>{b.general.number_of_believers}</td>
                <td className={tdClassName}>
                  {[
                    b.doctrines.primary,
                    b.doctrines.secondary,
                    b.doctrines.tertiary,
                  ]
                    .filter(Boolean)
                    .map((d) => text(d))
                    .join(" · ") || "—"}
                </td>
                <td className={tdClassName}>
                  <span
                    className={
                      b.devotion.is_target_reached
                        ? "text-green-700 dark:text-green-400"
                        : ""
                    }
                  >
                    {b.devotion.current} / {b.devotion.target}
                  </span>
                </td>
                <td className={tdClassName}>{b.high_priests.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      <SyncedAt syncedAt={snapshot.syncedAt} />

      {selected && (
        <DetailModal
          title={text(selected.general.name)}
          subtitle={`${selected.general.number_of_believers} fidèles`}
          onClose={() => setSelectedId(null)}
        >
          <DetailGrid
            items={[
              ["Doctrine primaire", text(selected.doctrines.primary)],
              ["Doctrine secondaire", text(selected.doctrines.secondary)],
              ["Doctrine tertiaire", text(selected.doctrines.tertiary)],
              [
                "Dévotion",
                `${selected.devotion.current} / ${selected.devotion.target}`,
              ],
              [
                "Objectif atteint",
                selected.devotion.is_target_reached ? "Oui" : "Non",
              ],
            ]}
          />
          <DetailSection
            title={`Grands prêtres (${selected.high_priests.length})`}
          >
            {selected.high_priests.length === 0 ? (
              "Aucun"
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {selected.high_priests.map((p) => (
                  <button
                    key={`${p.highpriest_id}-${p.character}`}
                    type="button"
                    onClick={() => onCharacterClick(text(p.character))}
                    className={linkClassName}
                  >
                    {text(p.character)}
                  </button>
                ))}
              </div>
            )}
          </DetailSection>
          <PublicNote note={selected.general.public_note} />
        </DetailModal>
      )}
    </div>
  );
}

// ---------- Domaines ----------

export function DomainesTab({
  onGuildClick,
}: {
  onGuildClick: (name: string) => void;
}) {
  const { snapshot, isLoading, error } = useGameSnapshot("domain");
  const { snapshot: vaults } = useGameSnapshot("vault");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = Object.entries(snapshot?.data ?? {}).sort(([, a], [, b]) =>
    text(a.domain_info.name).localeCompare(text(b.domain_info.name), "fr"),
  );
  const statuses = uniqueSorted(all.map(([, d]) => d.domain_info.dev_status));
  const resources = uniqueSorted(
    all.map(([, d]) => d.domain_info.ressource_type),
  );
  const visible = all.filter(
    ([, d]) =>
      (!statusFilter || d.domain_info.dev_status === statusFilter) &&
      (!resourceFilter || d.domain_info.ressource_type === resourceFilter) &&
      matches(
        query,
        d.domain_info.name,
        d.domain_info.owner,
        d.domain_info.guild?.name,
        d.domain_info.mine_type,
        ...d.buildings,
      ),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);
  const selected = selectedId ? snapshot?.data[selectedId] : null;
  const selectedVaults = Object.values(vaults?.data ?? {}).filter(
    (v) => String(v.domain.id) === selectedId,
  );

  if (isLoading || error || !snapshot)
    return (
      <SnapshotStatus
        isLoading={isLoading}
        error={error}
        hasData={Boolean(snapshot)}
      />
    );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Domaine, propriétaire, guilde, bâtiment…"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">Tous les développements</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {text(s)}
              </option>
            ))}
          </select>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">Toutes les ressources</option>
            {resources.map((r) => (
              <option key={r} value={r}>
                {text(r)}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-foreground/60">
          {visible.length} / {all.length} domaines
        </span>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className={thClassName}>Domaine</th>
              <th className={thClassName}>Guilde</th>
              <th className={thClassName}>Propriétaire</th>
              <th className={thClassName}>Développement</th>
              <th className={thClassName}>Ressource</th>
              <th className={thClassName}>Mine</th>
              <th className={thClassName}>Bâtiments</th>
              <th className={thClassName}>Position</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(([id, d]) => (
              <tr key={id} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={linkClassName}
                  >
                    {text(d.domain_info.name)}
                  </button>
                </td>
                <td className={tdClassName}>
                  <GuildLink
                    name={d.domain_info.guild?.name}
                    onGuildClick={onGuildClick}
                  />
                </td>
                <td className={tdClassName}>
                  {text(d.domain_info.owner) || "—"}
                </td>
                <td className={tdClassName}>
                  {text(d.domain_info.dev_status) || "—"}
                </td>
                <td className={tdClassName}>
                  {text(d.domain_info.ressource_type) || "—"}
                  {d.domain_info.coastal && (
                    <span className="ml-1 text-xs text-foreground/50">
                      (côtier)
                    </span>
                  )}
                </td>
                <td className={tdClassName}>
                  {[d.domain_info.mine_type, d.domain_info.mine_size]
                    .filter(Boolean)
                    .map((m) => text(m))
                    .join(" · ") || "—"}
                </td>
                <td className={tdClassName}>{d.buildings.length}</td>
                <td className={tdClassName}>
                  {formatCoordinates(d.domain_info.x, d.domain_info.y)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      <SyncedAt syncedAt={snapshot.syncedAt} />

      {selected && (
        <DetailModal
          title={text(selected.domain_info.name)}
          subtitle={text(selected.domain_info.dev_status)}
          onClose={() => setSelectedId(null)}
        >
          <DetailGrid
            items={[
              [
                "Guilde",
                <GuildLink
                  key="g"
                  name={selected.domain_info.guild?.name}
                  onGuildClick={(n) => {
                    setSelectedId(null);
                    onGuildClick(n);
                  }}
                />,
              ],
              ["Propriétaire", text(selected.domain_info.owner)],
              ["Ressource", text(selected.domain_info.ressource_type)],
              [
                "Mine",
                [selected.domain_info.mine_type, selected.domain_info.mine_size]
                  .filter(Boolean)
                  .map((m) => text(m))
                  .join(" · "),
              ],
              ["Côtier", selected.domain_info.coastal ? "Oui" : "Non"],
              [
                "Zone tellurique",
                selected.domain_info.zone_tellurique ? "Oui" : "Non",
              ],
              [
                "Position",
                formatCoordinates(
                  selected.domain_info.x,
                  selected.domain_info.y,
                ),
              ],
              ["Information clé", text(selected.domain_info.key_insight)],
            ]}
          />
          <DetailSection title={`Bâtiments (${selected.buildings.length})`}>
            {selected.buildings.length > 0
              ? selected.buildings.map((b) => text(b)).join(", ")
              : "Aucun"}
          </DetailSection>
          {selectedVaults.length > 0 && (
            <DetailSection title="Voûtes">
              {selectedVaults
                .map((v) => `${text(v.building)} : ${v.vault}`)
                .join(", ")}
            </DetailSection>
          )}
          <DetailSection title={`Unités (${sumUnits(selected.units)})`}>
            {formatUnits(selected.units)}
          </DetailSection>
          <PublicNote note={selected.domain_info.public_note} />
        </DetailModal>
      )}
    </div>
  );
}

// ---------- Géographie ----------

type GeoView = "regions" | "provinces" | "poi";

export function GeographieTab() {
  const [view, setView] = useState<GeoView>("regions");
  const views: { key: GeoView; label: string }[] = [
    { key: "regions", label: "Régions" },
    { key: "provinces", label: "Provinces" },
    { key: "poi", label: "Points d'intérêt" },
  ];

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-full bg-black/[.04] p-1 text-sm dark:bg-white/[.06] w-fit">
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              view === v.key
                ? "bg-white text-foreground shadow-sm dark:bg-zinc-800"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "regions" && <RegionsView />}
      {view === "provinces" && <ProvincesView />}
      {view === "poi" && <PoiView />}
    </div>
  );
}

function countDomains(fiefs: { domain: unknown[] }[]): number {
  return fiefs.reduce((total, f) => total + f.domain.length, 0);
}

function RegionsView() {
  const { snapshot, isLoading, error } = useGameSnapshot("region");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading || error || !snapshot)
    return (
      <SnapshotStatus
        isLoading={isLoading}
        error={error}
        hasData={Boolean(snapshot)}
      />
    );

  const all = Object.entries(snapshot.data).sort(([, a], [, b]) =>
    text(a.region_info.name).localeCompare(text(b.region_info.name), "fr"),
  );
  const selected = selectedId ? snapshot.data[selectedId] : null;

  return (
    <div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className={thClassName}>Région</th>
              <th className={thClassName}>Dirigeants</th>
              <th className={thClassName}>Provinces</th>
              <th className={thClassName}>Domaines</th>
              <th className={thClassName}>Réserve d&apos;influence</th>
            </tr>
          </thead>
          <tbody>
            {all.map(([id, r]) => (
              <tr key={id} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={linkClassName}
                  >
                    {text(r.region_info.name)}
                  </button>
                </td>
                <td className={tdClassName}>
                  {r.region_info.owners.map((o) => text(o)).join(", ") || "—"}
                </td>
                <td className={tdClassName}>{r.provinces.length}</td>
                <td className={tdClassName}>
                  {r.provinces.reduce((t, p) => t + countDomains(p.fiefs), 0)}
                </td>
                <td className={tdClassName}>{r.reserve.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SyncedAt syncedAt={snapshot.syncedAt} />

      {selected && (
        <DetailModal
          title={text(selected.region_info.name)}
          subtitle={selected.region_info.owners.map((o) => text(o)).join(", ")}
          onClose={() => setSelectedId(null)}
        >
          <DetailGrid
            items={[
              ["Base", selected.reserve.base],
              ["Voûtes", selected.reserve.vault_total],
              ["Bonus de voûtes", selected.reserve.vault_bonus],
              ["Bonus maritime", selected.reserve.maritime_bonus],
              ["Réserve totale", selected.reserve.total],
            ]}
          />
          <DetailSection title={`Provinces (${selected.provinces.length})`}>
            <ul className="flex flex-col gap-1">
              {selected.provinces.map((p) => (
                <li key={p.id}>
                  <span className="font-medium text-foreground">
                    {text(p.name)}
                  </span>
                  {" — "}
                  {p.fiefs.length} fiefs, {countDomains(p.fiefs)} domaines
                </li>
              ))}
            </ul>
          </DetailSection>
          <PublicNote note={selected.region_info.public_note} />
        </DetailModal>
      )}
    </div>
  );
}

function ProvincesView() {
  const { snapshot, isLoading, error } = useGameSnapshot("province");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = Object.entries(snapshot?.data ?? {}).sort(([, a], [, b]) =>
    text(a.province_info.name).localeCompare(text(b.province_info.name), "fr"),
  );
  const visible = all.filter(([, p]) =>
    matches(
      query,
      p.province_info.name,
      p.province_info.owner,
      ...p.fiefs.map((f) => f.name),
    ),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);
  const selected = selectedId ? snapshot?.data[selectedId] : null;

  if (isLoading || error || !snapshot)
    return (
      <SnapshotStatus
        isLoading={isLoading}
        error={error}
        hasData={Boolean(snapshot)}
      />
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Province, dirigeant, fief…"
        />
        <span className="text-sm text-foreground/60">
          {visible.length} / {all.length} provinces
        </span>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className={thClassName}>Province</th>
              <th className={thClassName}>Dirigeant</th>
              <th className={thClassName}>Guildes affiliées</th>
              <th className={thClassName}>Fiefs</th>
              <th className={thClassName}>Domaines</th>
              <th className={thClassName}>Réserve d&apos;influence</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(([id, p]) => (
              <tr key={id} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={linkClassName}
                  >
                    {text(p.province_info.name)}
                  </button>
                </td>
                <td className={tdClassName}>
                  {text(p.province_info.owner) || "—"}
                </td>
                <td className={tdClassName}>
                  {p.province_info.number_of_affiliated_guilds}
                </td>
                <td className={tdClassName}>{p.fiefs.length}</td>
                <td className={tdClassName}>{countDomains(p.fiefs)}</td>
                <td className={tdClassName}>{p.reserve.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      <SyncedAt syncedAt={snapshot.syncedAt} />

      {selected && (
        <DetailModal
          title={text(selected.province_info.name)}
          subtitle={text(selected.province_info.owner)}
          onClose={() => setSelectedId(null)}
        >
          <DetailGrid
            items={[
              [
                "Guildes affiliées",
                selected.province_info.number_of_affiliated_guilds,
              ],
              ["Base", selected.reserve.base],
              ["Voûtes", selected.reserve.vault_total],
              ["Bonus de voûtes", selected.reserve.vault_bonus],
              ["Réserve totale", selected.reserve.total],
            ]}
          />
          <DetailSection title={`Fiefs (${selected.fiefs.length})`}>
            <ul className="flex flex-col gap-1">
              {selected.fiefs.map((f) => (
                <li key={f.id}>
                  <span className="font-medium text-foreground">
                    {text(f.name)}
                  </span>
                  {" — "}
                  {f.domain.map((d) => text(d.name)).join(", ") ||
                    "aucun domaine"}
                </li>
              ))}
            </ul>
          </DetailSection>
          {selected.reserve.entries.length > 0 && (
            <DetailSection title="Voûtes de la réserve">
              {selected.reserve.entries
                .map(
                  (e) => `${text(e.domain)} (${text(e.building)}) : ${e.vault}`,
                )
                .join(", ")}
            </DetailSection>
          )}
          <PublicNote note={selected.province_info.public_note} />
        </DetailModal>
      )}
    </div>
  );
}

function PoiView() {
  const { snapshot, isLoading, error } = useGameSnapshot("poi");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const all = Object.entries(snapshot?.data ?? {})
    .flatMap(([category, pois]) =>
      Object.entries(pois).map(([id, poi]) => ({
        key: `${category}-${id}`,
        poi,
      })),
    )
    .sort((a, b) => text(a.poi.name).localeCompare(text(b.poi.name), "fr"));
  const categories = uniqueSorted(Object.keys(snapshot?.data ?? {}));
  const visible = all.filter(
    ({ poi }) =>
      (!categoryFilter || poi.category === categoryFilter) &&
      matches(query, poi.name, poi.region, poi.category),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);
  const selected = all.find((p) => p.key === selectedKey)?.poi;

  if (isLoading || error || !snapshot)
    return (
      <SnapshotStatus
        isLoading={isLoading}
        error={error}
        hasData={Boolean(snapshot)}
      />
    );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Nom, région…"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {text(c)}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-foreground/60">
          {visible.length} / {all.length} points d&apos;intérêt
        </span>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className={thClassName}>Nom</th>
              <th className={thClassName}>Catégorie</th>
              <th className={thClassName}>Région</th>
              <th className={thClassName}>Position</th>
              <th className={thClassName}>Bloque la construction</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(({ key, poi }) => (
              <tr key={key} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">
                  <button
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={linkClassName}
                  >
                    {text(poi.name)}
                  </button>
                </td>
                <td className={tdClassName}>{text(poi.category)}</td>
                <td className={tdClassName}>{text(poi.region) || "—"}</td>
                <td className={tdClassName}>
                  {formatCoordinates(poi.x, poi.y)}
                </td>
                <td className={tdClassName}>
                  {poi.prevent_construction ? "Oui" : "Non"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      <SyncedAt syncedAt={snapshot.syncedAt} />

      {selected && (
        <DetailModal
          title={text(selected.name)}
          subtitle={text(selected.category)}
          onClose={() => setSelectedKey(null)}
        >
          <DetailGrid
            items={[
              ["Région", text(selected.region)],
              ["Position", formatCoordinates(selected.x, selected.y)],
              [
                "Bloque la construction",
                selected.prevent_construction ? "Oui" : "Non",
              ],
            ]}
          />
          <PublicNote note={selected.public_note} />
        </DetailModal>
      )}
    </div>
  );
}

// ---------- Militaire ----------

export function ArmeesTab({
  onGuildClick,
}: {
  onGuildClick: (name: string) => void;
}) {
  const { snapshot, isLoading, error } = useGameSnapshot("army");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = Object.entries(snapshot?.data ?? {}).sort(([, a], [, b]) =>
    text(a.name).localeCompare(text(b.name), "fr"),
  );
  const visible = all.filter(([, a]) =>
    matches(
      query,
      a.name,
      a.guild?.name,
      a.general?.name,
      a.category,
      ...a.units.map((u) => u.units_name),
    ),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);
  const selected = selectedId ? snapshot?.data[selectedId] : null;

  if (isLoading || error || !snapshot)
    return (
      <SnapshotStatus
        isLoading={isLoading}
        error={error}
        hasData={Boolean(snapshot)}
      />
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Bannière, guilde, général, unité…"
        />
        <span className="text-sm text-foreground/60">
          {visible.length} / {all.length} armées
        </span>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className={thClassName}>Bannière</th>
              <th className={thClassName}>Guilde</th>
              <th className={thClassName}>Général</th>
              <th className={thClassName}>Catégorie</th>
              <th className={thClassName}>Effectif</th>
              <th className={thClassName}>Unités</th>
              <th className={thClassName}>Position</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(([id, a]) => (
              <tr key={id} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={linkClassName}
                  >
                    {text(a.name)}
                  </button>
                </td>
                <td className={tdClassName}>
                  <GuildLink name={a.guild?.name} onGuildClick={onGuildClick} />
                </td>
                <td className={tdClassName}>{text(a.general?.name) || "—"}</td>
                <td className={tdClassName}>{text(a.category)}</td>
                <td className={tdClassName}>{sumUnits(a.units)}</td>
                <td className={tdClassName}>{formatUnits(a.units)}</td>
                <td className={tdClassName}>{formatCoordinates(a.x, a.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      <SyncedAt syncedAt={snapshot.syncedAt} />

      {selected && (
        <DetailModal
          title={text(selected.name)}
          subtitle={text(selected.category)}
          onClose={() => setSelectedId(null)}
        >
          <DetailGrid
            items={[
              ["Guilde", text(selected.guild?.name)],
              ["Général", text(selected.general?.name)],
              ["Position", formatCoordinates(selected.x, selected.y)],
              ["Effectif", sumUnits(selected.units)],
              ["Information clé", text(selected.key_insight)],
            ]}
          />
          <DetailSection title="Unités">
            {formatUnits(selected.units)}
          </DetailSection>
          <PublicNote note={selected.public_note} />
        </DetailModal>
      )}
    </div>
  );
}

export function NaviresTab({
  onGuildClick,
}: {
  onGuildClick: (name: string) => void;
}) {
  const { snapshot, isLoading, error } = useGameSnapshot("ship");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = Object.entries(snapshot?.data ?? {}).sort(([, a], [, b]) =>
    text(a.name).localeCompare(text(b.name), "fr"),
  );
  const categories = uniqueSorted(all.map(([, s]) => s.category));
  const visible = all.filter(
    ([, s]) =>
      (!categoryFilter || s.category === categoryFilter) &&
      matches(
        query,
        s.name,
        s.guild?.name,
        s.owner?.name,
        ...s.improvements,
        ...s.banners,
      ),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);
  const selected = selectedId ? snapshot?.data[selectedId] : null;

  if (isLoading || error || !snapshot)
    return (
      <SnapshotStatus
        isLoading={isLoading}
        error={error}
        hasData={Boolean(snapshot)}
      />
    );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Navire, guilde, capitaine…"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {text(c)}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-foreground/60">
          {visible.length} / {all.length} navires
        </span>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className={thClassName}>Navire</th>
              <th className={thClassName}>Guilde</th>
              <th className={thClassName}>Propriétaire</th>
              <th className={thClassName}>Catégorie</th>
              <th className={thClassName}>Structure</th>
              <th className={thClassName}>Effectif</th>
              <th className={thClassName}>Position</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(([id, s]) => (
              <tr key={id} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={linkClassName}
                  >
                    {text(s.name)}
                  </button>
                  {s.is_admiral && (
                    <span className="ml-1.5 text-xs text-foreground/50">
                      (amiral)
                    </span>
                  )}
                </td>
                <td className={tdClassName}>
                  <GuildLink name={s.guild?.name} onGuildClick={onGuildClick} />
                </td>
                <td className={tdClassName}>{text(s.owner?.name) || "—"}</td>
                <td className={tdClassName}>{text(s.category)}</td>
                <td className={tdClassName}>
                  <span
                    className={
                      s.current_structure < s.max_structure
                        ? "text-red-600 dark:text-red-400"
                        : ""
                    }
                  >
                    {s.current_structure} / {s.max_structure}
                  </span>
                </td>
                <td className={tdClassName}>{sumUnits(s.units)}</td>
                <td className={tdClassName}>{formatCoordinates(s.x, s.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      <SyncedAt syncedAt={snapshot.syncedAt} />

      {selected && (
        <DetailModal
          title={text(selected.name)}
          subtitle={`${text(selected.category)}${selected.is_admiral ? " · navire amiral" : ""}`}
          onClose={() => setSelectedId(null)}
        >
          <DetailGrid
            items={[
              ["Guilde", text(selected.guild?.name)],
              ["Propriétaire", text(selected.owner?.name)],
              [
                "Structure",
                `${selected.current_structure} / ${selected.max_structure}`,
              ],
              ["Position", formatCoordinates(selected.x, selected.y)],
              ["Information clé", text(selected.key_insight)],
            ]}
          />
          <DetailSection title="Améliorations">
            {selected.improvements.map((i) => text(i)).join(", ") || "Aucune"}
          </DetailSection>
          <DetailSection title="Bannières à bord">
            {selected.banners.map((b) => text(b)).join(", ") || "Aucune"}
          </DetailSection>
          <DetailSection title={`Unités (${sumUnits(selected.units)})`}>
            {formatUnits(selected.units)}
          </DetailSection>
          <PublicNote note={selected.public_note} />
        </DetailModal>
      )}
    </div>
  );
}

// ---------- Fiche guilde ----------

export function GuildDetailModal({
  guildId,
  onClose,
}: {
  guildId: number;
  onClose: () => void;
}) {
  const { snapshot: guilds } = useGameSnapshot("guild");
  const { snapshot: domains } = useGameSnapshot("domain");
  const { snapshot: armies } = useGameSnapshot("army");
  const { snapshot: ships } = useGameSnapshot("ship");
  const { snapshot: mages } = useGameSnapshot("mage");

  const guild = guilds?.data[String(guildId)];
  const ofGuild = <T extends { guild: { id: number } | null }>(
    items: Record<string, T> | undefined,
  ) => Object.values(items ?? {}).filter((item) => item.guild?.id === guildId);
  const guildDomains = Object.values(domains?.data ?? {}).filter(
    (d) => d.domain_info.guild?.id === guildId,
  );
  const guildArmies = ofGuild(armies?.data);
  const guildShips = ofGuild(ships?.data);
  const guildMages = ofGuild(mages?.data);

  if (!guild)
    return (
      <DetailModal title="Guilde" onClose={onClose}>
        <p className="text-sm text-foreground/60">
          {guilds
            ? "Cette guilde n'apparaît pas dans les données du jeu."
            : "Chargement…"}
        </p>
      </DetailModal>
    );

  const { general, notoriety } = guild;
  const base = notoriety.base_notoriety;

  return (
    <DetailModal
      title={text(general.name)}
      subtitle={[text(general.province), text(general.region)]
        .filter(Boolean)
        .join(", ")}
      onClose={onClose}
    >
      <DetailGrid
        items={[
          ["Dirigeant", text(general.owner)],
          ["Fondation", general.founding_year ?? ""],
          ["Membres", general.number_of_guildies],
          ["Faction", general.is_faction ? "Oui" : "Non"],
          ["Notoriété", notoriety.current_notoriety],
          ["Notoriété dernière GB", notoriety.last_gb_notoriety],
          ["Présences", notoriety.total_presences],
        ]}
      />
      <DetailSection title="Notoriété de base">
        Taille {base.taille} · Ancienneté {base.anciennete} · Décorum{" "}
        {base.decorum} · Campement {base.campement} · Quartier {base.quartier}
      </DetailSection>
      {notoriety.exploits.length > 0 && (
        <DetailSection title={`Exploits (${notoriety.exploits.length})`}>
          <ul className="flex flex-col gap-0.5">
            {notoriety.exploits.map((e, i) => (
              <li key={`${e.name}-${i}`}>
                {text(e.name)}{" "}
                <span className="text-foreground/50">
                  (+{e.bonus}
                  {e.season ? `, ${text(e.season)}` : ""})
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
      <DetailSection
        title={`Domaines (${domains ? guildDomains.length : "…"})`}
      >
        {guildDomains.length > 0
          ? guildDomains
              .map(
                (d) =>
                  `${text(d.domain_info.name)} (${text(d.domain_info.dev_status)})`,
              )
              .sort((a, b) => a.localeCompare(b, "fr"))
              .join(", ")
          : domains
            ? "Aucun"
            : "Chargement…"}
      </DetailSection>
      <DetailSection title={`Armées (${armies ? guildArmies.length : "…"})`}>
        {guildArmies.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {guildArmies.map((a) => (
              <li key={a.name}>
                <span className="font-medium text-foreground">
                  {text(a.name)}
                </span>{" "}
                — {formatUnits(a.units)}
              </li>
            ))}
          </ul>
        ) : armies ? (
          "Aucune"
        ) : (
          "Chargement…"
        )}
      </DetailSection>
      <DetailSection title={`Navires (${ships ? guildShips.length : "…"})`}>
        {guildShips.length > 0
          ? guildShips
              .map((s) => `${text(s.name)} (${text(s.category)})`)
              .join(", ")
          : ships
            ? "Aucun"
            : "Chargement…"}
      </DetailSection>
      <DetailSection title={`Mages (${mages ? guildMages.length : "…"})`}>
        {guildMages.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {guildMages.map((m) => (
              <li key={m.character}>
                <span className="font-medium text-foreground">
                  {text(m.character)}
                </span>
                {m.spells.length > 0 && (
                  <> — {m.spells.map((s) => text(s.name)).join(", ")}</>
                )}
              </li>
            ))}
          </ul>
        ) : mages ? (
          "Aucun"
        ) : (
          "Chargement…"
        )}
      </DetailSection>
    </DetailModal>
  );
}
