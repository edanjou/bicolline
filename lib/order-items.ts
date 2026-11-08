import { canonicalHref } from "@/lib/gb-years";

// Les liens sont comparés sans l'année de la Grande Bataille : un même ordre
// de tuiles sert à toutes les éditions.
export function orderItems<T extends { href: string }>(
  available: T[],
  savedOrder: string[] | null,
): T[] {
  if (!savedOrder) return available;
  const saved = savedOrder.map(canonicalHref);
  const byHref = new Map(
    available.map((item) => [canonicalHref(item.href), item]),
  );
  const ordered = saved
    .map((href) => byHref.get(href))
    .filter((item): item is T => Boolean(item));
  const remaining = available.filter(
    (item) => !saved.includes(canonicalHref(item.href)),
  );
  return [...ordered, ...remaining];
}
