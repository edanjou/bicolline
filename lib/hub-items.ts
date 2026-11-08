import {
  Archive,
  Award,
  Axe,
  Brain,
  BriefcaseMedical,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Castle,
  ChessKnight,
  ChessPawn,
  CircleDollarSign,
  Clock,
  ClipboardList,
  Drama,
  Gavel,
  Hammer,
  Home,
  IdCard,
  Inbox,
  KeyRound,
  ListChecks,
  MapPinned,
  MessageSquarePlus,
  NotebookPen,
  Package,
  PencilRuler,
  PocketKnife,
  Printer,
  Radio,
  ScrollText,
  ShieldCheck,
  ShieldUser,
  Shirt,
  Swords,
  Theater,
  TicketCheck,
  Trophy,
  Users,
  VenetianMask,
} from "lucide-react";
import type { HubItem, OrderColumn } from "@/components/module-hub";
import {
  canonicalHref,
  gbYearFromPath,
  GB_PLACEHOLDER_PREFIX,
  withGbYear,
} from "@/lib/gb-years";
import BicollineIcon from "@/components/bicolline-icon";

export const COMBAT_ITEMS: HubItem[] = [
  {
    href: "/grande-bataille/[annee]/combat/choses-a-faire",
    label: "Choses à faire",
    icon: ListChecks,
    moduleKey: "grandes-batailles",
  },
  {
    href: "/grande-bataille/[annee]/combat/escarmouches",
    label: "Escarmouches",
    icon: Axe,
  },
  {
    href: "/grande-bataille/[annee]/combat/homologation",
    label: "Homologation",
    icon: ShieldCheck,
  },
  {
    href: "/grande-bataille/[annee]/combat/volontaires",
    label: "Volontaires",
    icon: Users,
    moduleKey: "benevoles",
  },
  {
    href: "/grande-bataille/[annee]/combat/feuille-de-temps",
    label: "Feuille de temps",
    icon: Clock,
    moduleKey: "feuille-de-temps",
  },
  {
    href: "/grande-bataille/[annee]/combat/grandes-batailles",
    label: "Grandes Batailles",
    icon: Castle,
    moduleKey: "grandes-batailles",
  },
  {
    href: "/grande-bataille/[annee]/combat/bilan",
    label: "Bilan",
    icon: NotebookPen,
    moduleKey: "bilan",
  },
  {
    href: "/grande-bataille/[annee]/combat/inventaire",
    label: "Inventaire matériel",
    icon: Package,
    moduleKey: "inventaire-combat",
  },
  {
    href: "/grande-bataille/[annee]/combat/disponibilites",
    label: "Disponibilités",
    icon: CalendarCheck,
    moduleKey: "disponibilites",
  },
];

export const OUTILS_ITEMS: HubItem[] = [
  {
    href: "/grande-bataille/[annee]/outils/reservation-plateaux",
    label: "Réservation des plateaux",
    icon: CalendarClock,
    moduleKey: "plateaux",
  },
  {
    href: "/grande-bataille/[annee]/outils/volontaires",
    label: "Volontaires",
    icon: Users,
    moduleKey: "volontaires-centralise",
  },
  {
    href: "/grande-bataille/[annee]/outils/radios",
    label: "Radios",
    icon: Radio,
    moduleKey: "radios",
  },
  {
    href: "/grande-bataille/[annee]/outils/cles",
    label: "Clés",
    icon: KeyRound,
    moduleKey: "cles",
  },
  {
    href: "/grande-bataille/[annee]/outils/impressions",
    label: "Impressions",
    icon: Printer,
    moduleKey: "impressions",
  },
  {
    href: "/grande-bataille/[annee]/outils/costumes",
    label: "Costumes et accessoires",
    icon: Shirt,
    moduleKey: "costumes",
  },
  {
    href: "/grande-bataille/[annee]/outils/calendrier",
    label: "Calendrier",
    icon: CalendarDays,
    moduleKey: "calendrier",
  },
];

export const GRANDE_BATAILLE_ITEMS: HubItem[] = [
  {
    href: "/grande-bataille/[annee]/combat",
    label: "Combat",
    icon: Swords,
    noGate: true,
    childItems: COMBAT_ITEMS,
  },
  {
    href: "/grande-bataille/[annee]/outils",
    label: "Outils",
    icon: PencilRuler,
    noGate: true,
    childItems: OUTILS_ITEMS,
  },
  {
    href: "/grande-bataille/[annee]/tournois",
    label: "Tournois",
    icon: Trophy,
    moduleKey: "tournois",
  },
  {
    href: "/grande-bataille/[annee]/generale",
    label: "Générale",
    icon: Brain,
    moduleKey: "generale",
  },
  {
    href: "/grande-bataille/[annee]/jeu-gb",
    label: "Jeu",
    icon: ChessPawn,
    moduleKey: "jeu-gb",
  },
  {
    href: "/grande-bataille/[annee]/securite",
    label: "Sécurité",
    icon: BriefcaseMedical,
    moduleKey: "securite",
  },
  {
    href: "/grande-bataille/[annee]/accueil",
    label: "Accueil",
    icon: Home,
    moduleKey: "accueil",
  },
  {
    href: "/grande-bataille/[annee]/vie-du-duche",
    label: "Vie du Duché",
    icon: Theater,
    moduleKey: "vie-du-duche",
  },
  {
    href: "/grande-bataille/[annee]/operations",
    label: "Opérations",
    icon: ClipboardList,
    moduleKey: "operations",
  },
  {
    href: "/grande-bataille/[annee]/administration",
    label: "Administration",
    icon: CircleDollarSign,
    moduleKey: "administration",
  },
];

// Coordinations with only the 4 generic modules (Volontaires, Feuille de
// temps, Bilan, Choses à faire) — served by the [coordination] dynamic
// route, unlike Combat/Tournois which have their own static folders and
// extra, coordination-specific pages.
export const EXTRA_COORDINATIONS: { key: string; label: string }[] = [
  { key: "generale", label: "Générale" },
  { key: "jeu-gb", label: "Jeu" },
  { key: "securite", label: "Sécurité" },
  { key: "accueil", label: "Accueil" },
  { key: "vie-du-duche", label: "Vie du Duché" },
  { key: "operations", label: "Opérations" },
  { key: "administration", label: "Administration" },
];

export function coordinationLabel(key: string): string {
  return EXTRA_COORDINATIONS.find((c) => c.key === key)?.label ?? key;
}

// All 9 coordinations (the 2 with their own static folders + the 7 simple
// ones), for cross-coordination tools like the centralized volunteer view
// and the plateau booking board.
export const ALL_COORDINATIONS: { key: string; label: string }[] = [
  { key: "combat", label: "Combat" },
  { key: "tournois", label: "Tournois" },
  ...EXTRA_COORDINATIONS,
];

export function allCoordinationLabel(key: string): string {
  return ALL_COORDINATIONS.find((c) => c.key === key)?.label ?? key;
}

export const CAMPAGNES_ITEMS: HubItem[] = [
  { href: "/campagnes/marechaux", label: "Liste maréchaux", icon: PocketKnife },
  {
    href: "/campagnes/liste-pnj",
    label: "Liste PNJ",
    icon: VenetianMask,
    moduleKey: "pnj",
    disabled: true,
  },
  {
    href: "/campagnes/activites",
    label: "Campagnes militaires",
    icon: Swords,
    moduleKey: "activites",
  },
  {
    href: "/campagnes/documents",
    label: "Gestion documentaire",
    icon: Archive,
    moduleKey: "documents",
  },
  {
    href: "/campagnes/scenarios",
    label: "Scénarios spéciaux",
    icon: ScrollText,
    moduleKey: "scenarios",
    disabled: true,
  },
];

export const DASHBOARD_ITEMS: HubItem[] = [
  {
    href: "/campagnes",
    label: "Activités",
    icon: Swords,
    noGate: true,
    childItems: CAMPAGNES_ITEMS,
  },
  {
    href: "/grande-bataille",
    label: "Grande Bataille",
    icon: BicollineIcon,
    noGate: true,
    childItems: GRANDE_BATAILLE_ITEMS,
  },
  { href: "/jeu", label: "Jeu", icon: ChessKnight, moduleKey: "jeu" },
  {
    href: "/comite-combat",
    label: "Comité Combat",
    icon: Gavel,
    moduleKey: "comite-combat",
  },
  {
    href: "/evenements/inscriptions",
    label: "Inscriptions",
    icon: TicketCheck,
    moduleKey: "evenements",
  },
  {
    href: "#tournoi-des-nations",
    label: "Tournoi des nations",
    icon: Award,
    disabled: true,
  },
  {
    href: "#bal-pourpre",
    label: "Bal pourpre",
    icon: Drama,
    disabled: true,
  },
  {
    href: "/editeur-carte",
    label: "Création de carte",
    icon: MapPinned,
    moduleKey: "editeur-carte",
  },
  { href: "/utilisateurs", label: "Utilisateurs", icon: IdCard, pinned: true },
];

// Rendered next to the dark mode toggle (top-right, visible on every
// authenticated page) instead of the per-section sidebar, since Paramètres/
// Mon compte are global and not tied to any hub context.
export const TOP_BAR_ITEMS: HubItem[] = [
  { href: "/choses-a-faire", label: "Choses à faire", icon: ListChecks },
  { href: "/demandes", label: "Demandes", icon: Inbox },
  {
    href: "/demandes/nouvelle",
    label: "Faire une demande",
    icon: MessageSquarePlus,
    noGate: true,
    hideForAdmin: true,
  },
  { href: "/parametres", label: "Paramètres", icon: Hammer },
  {
    href: "/mon-compte",
    label: "Mon compte",
    icon: ShieldUser,
    noGate: true,
  },
];

const BREADCRUMB_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...DASHBOARD_ITEMS,
    ...CAMPAGNES_ITEMS,
    ...GRANDE_BATAILLE_ITEMS,
    ...COMBAT_ITEMS,
    ...OUTILS_ITEMS,
    ...TOP_BAR_ITEMS,
  ]
    .filter((item) => !item.disabled && item.href.startsWith("/"))
    .map((item) => [item.href, item.label]),
);
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/feuille-de-temps"] =
  "Feuille de temps";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/volontaires"] =
  "Volontaires";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/bilan"] = "Bilan";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/choses-a-faire"] =
  "Choses à faire";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/gestion"] =
  "Gestion des tournois";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/taktika"] = "Taktika";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/taktika/equipes"] =
  "Équipes";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/taktika/horaires"] =
  "Gestion des horaires";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/taktika/reglements"] =
  "Gestion des règlements";
BREADCRUMB_LABELS["/grande-bataille/[annee]/tournois/taktika/inventaire"] =
  "Inventaire matériel";
BREADCRUMB_LABELS["/evenements/liste"] = "Évènements";
BREADCRUMB_LABELS["/evenements/admissions"] = "Admission";
BREADCRUMB_LABELS["/evenements/inscriptions"] = "Inscriptions";
BREADCRUMB_LABELS["/comite-combat/reglements"] = "Règles de combat";
BREADCRUMB_LABELS["/comite-combat/standards"] = "Standards d'homologation";
BREADCRUMB_LABELS["/comite-combat/avertissements"] = "Avertissements";
BREADCRUMB_LABELS["/comite-combat/procedures"] = "Procédures";
BREADCRUMB_LABELS["/grande-bataille/[annee]/combat/homologation/horaires"] =
  "Horaires";
BREADCRUMB_LABELS["/grande-bataille/[annee]/combat/homologation/inventaire"] =
  "Inventaire matériel";
BREADCRUMB_LABELS["/grande-bataille/[annee]/combat/homologation/inscriptions"] =
  "Inscription mobile";
BREADCRUMB_LABELS[
  "/grande-bataille/[annee]/combat/homologation/machines-de-guerre"
] = "Machines de guerre";
BREADCRUMB_LABELS["/grande-bataille/[annee]/combat/homologation/bestiaire"] =
  "Bestiaire";
for (const c of EXTRA_COORDINATIONS) {
  BREADCRUMB_LABELS[`/grande-bataille/[annee]/${c.key}/volontaires`] =
    "Volontaires";
  BREADCRUMB_LABELS[`/grande-bataille/[annee]/${c.key}/feuille-de-temps`] =
    "Feuille de temps";
  BREADCRUMB_LABELS[`/grande-bataille/[annee]/${c.key}/bilan`] = "Bilan";
  BREADCRUMB_LABELS[`/grande-bataille/[annee]/${c.key}/choses-a-faire`] =
    "Choses à faire";
}

export function breadcrumbFor(
  pathname: string,
): { href: string; label: string }[] {
  if (pathname === "/tableau-de-bord") return [];
  const crumbs: { href: string; label: string }[] = [];
  const segments = pathname.split("/").filter(Boolean);
  const year = gbYearFromPath(pathname);
  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    const canonical = canonicalHref(acc);
    const label =
      canonical === GB_PLACEHOLDER_PREFIX
        ? String(year ?? segment)
        : BREADCRUMB_LABELS[canonical];
    if (label) crumbs.push({ href: acc, label });
  }
  return crumbs;
}

export function hubContextFor(pathname: string): {
  items: HubItem[];
  orderColumn: OrderColumn;
} {
  const year = gbYearFromPath(pathname);
  if (year !== null) {
    const canonical = canonicalHref(pathname);
    if (canonical.startsWith(`${GB_PLACEHOLDER_PREFIX}/combat`)) {
      return {
        items: withGbYear(COMBAT_ITEMS, year),
        orderColumn: "combat_order",
      };
    }
    if (canonical.startsWith(`${GB_PLACEHOLDER_PREFIX}/outils`)) {
      return {
        items: withGbYear(OUTILS_ITEMS, year),
        orderColumn: "outils_order",
      };
    }
    return {
      items: withGbYear(GRANDE_BATAILLE_ITEMS, year),
      orderColumn: "grande_bataille_order",
    };
  }
  if (pathname.startsWith("/campagnes")) {
    return { items: CAMPAGNES_ITEMS, orderColumn: "campagnes_order" };
  }
  return { items: DASHBOARD_ITEMS, orderColumn: "dashboard_order" };
}
