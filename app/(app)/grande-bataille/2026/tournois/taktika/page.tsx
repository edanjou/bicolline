"use client";

import { CalendarClock, Package, ScrollText } from "lucide-react";
import BannerIcon from "@/components/banner-icon";
import CoordinationHub from "@/components/coordination-hub";
import RequireFeature from "@/components/require-feature";
import type { HubItem } from "@/components/module-hub";

const BASE_PATH = "/grande-bataille/2026/tournois/taktika";

const TAKTIKA_ITEMS: HubItem[] = [
  { href: `${BASE_PATH}/equipes`, label: "Équipes", icon: BannerIcon },
  {
    href: `${BASE_PATH}/horaires`,
    label: "Gestion des horaires",
    icon: CalendarClock,
  },
  {
    href: `${BASE_PATH}/reglements`,
    label: "Gestion des règlements",
    icon: ScrollText,
  },
  {
    href: `${BASE_PATH}/inventaire`,
    label: "Inventaire matériel",
    icon: Package,
  },
];

export default function TaktikaPage() {
  return (
    <RequireFeature feature="tournois">
      <CoordinationHub
        title="Taktika"
        basePath={BASE_PATH}
        items={TAKTIKA_ITEMS}
      />
    </RequireFeature>
  );
}
