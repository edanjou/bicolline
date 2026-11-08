// Éditions de la Grande Bataille. Ajouter une année ici suffit à ouvrir
// /grande-bataille/<année> ; ses données démarrent vides.
export const GB_YEARS = [2026, 2027] as const;

// Édition utilisée par les formulaires publics (homologation, machines de
// guerre), qui n'ont pas d'année dans leur adresse.
export const CURRENT_GB_YEAR = 2026;

export function isGbYear(value: unknown): boolean {
  return GB_YEARS.includes(Number(value) as (typeof GB_YEARS)[number]);
}

export function gbPath(year: number, path = ""): string {
  return `/grande-bataille/${year}${path ? `/${path.replace(/^\//, "")}` : ""}`;
}

const GB_YEAR_PREFIX = /^\/grande-bataille\/\d{4}(?=\/|$)/;
export const GB_PLACEHOLDER_PREFIX = "/grande-bataille/[annee]";

// Lien sans année, pour comparer et enregistrer l'ordre des tuiles une seule
// fois pour toutes les éditions.
export function canonicalHref(href: string): string {
  return href.replace(GB_YEAR_PREFIX, GB_PLACEHOLDER_PREFIX);
}

export function gbYearFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/grande-bataille\/(\d{4})(?=\/|$)/);
  return match && isGbYear(match[1]) ? Number(match[1]) : null;
}

export function withGbYear<T extends { href: string; childItems?: T[] }>(
  items: T[],
  year: number,
): T[] {
  return items.map((item) => ({
    ...item,
    href: item.href.replace(GB_PLACEHOLDER_PREFIX, gbPath(year)),
    ...(item.childItems
      ? { childItems: withGbYear(item.childItems, year) }
      : {}),
  }));
}
