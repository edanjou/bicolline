"use client";

import {
  CalendarClock,
  ClipboardList,
  Crosshair,
  Package,
  Skull,
} from "lucide-react";
import CoordinationHub from "@/components/coordination-hub";
import RequireFeature from "@/components/require-feature";
import type { HubItem } from "@/components/module-hub";
import { withGbYear } from "@/lib/gb-years";
import { useGbYear } from "@/lib/use-gb-year";

const BASE_PATH = "/grande-bataille/[annee]/combat/homologation";

const HOMOLOGATION_ITEMS: HubItem[] = [
  {
    href: `${BASE_PATH}/inventaire`,
    label: "Inventaire matériel",
    icon: Package,
  },
  { href: `${BASE_PATH}/horaires`, label: "Horaires", icon: CalendarClock },
  {
    href: `${BASE_PATH}/inscriptions`,
    label: "Inscription mobile",
    icon: ClipboardList,
  },
  {
    href: `${BASE_PATH}/machines-de-guerre`,
    label: "Machines de guerre",
    icon: Crosshair,
  },
  { href: `${BASE_PATH}/bestiaire`, label: "Bestiaire", icon: Skull },
];

export default function HomologationPage() {
  const year = useGbYear();
  return (
    <RequireFeature feature="homologation">
      <CoordinationHub
        title="Homologation"
        basePath={withGbYear([{ href: BASE_PATH }], year)[0].href}
        items={withGbYear(HOMOLOGATION_ITEMS, year)}
      />
    </RequireFeature>
  );
}
