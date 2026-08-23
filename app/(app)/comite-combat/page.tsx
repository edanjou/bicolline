"use client";

import { AlertTriangle, Archive, ScrollText, ShieldCheck } from "lucide-react";
import CoordinationHub from "@/components/coordination-hub";
import type { HubItem } from "@/components/module-hub";
import RequireFeature from "@/components/require-feature";

const BASE_PATH = "/comite-combat";

const COMITE_COMBAT_ITEMS: HubItem[] = [
  {
    href: `${BASE_PATH}/reglements`,
    label: "Règles de combat",
    icon: ScrollText,
  },
  {
    href: `${BASE_PATH}/standards`,
    label: "Standards d'homologation",
    icon: ShieldCheck,
  },
  {
    href: `${BASE_PATH}/avertissements`,
    label: "Avertissements",
    icon: AlertTriangle,
  },
  {
    href: `${BASE_PATH}/procedures`,
    label: "Procédures",
    icon: Archive,
  },
];

export default function ComiteCombatPage() {
  return (
    <RequireFeature feature="comite-combat">
      <CoordinationHub
        title="Comité Combat"
        basePath={BASE_PATH}
        items={COMITE_COMBAT_ITEMS}
      />
    </RequireFeature>
  );
}
