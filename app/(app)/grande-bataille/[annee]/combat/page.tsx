"use client";

import ModuleHub from "@/components/module-hub";
import { withGbYear } from "@/lib/gb-years";
import { useGbYear } from "@/lib/use-gb-year";
import { COMBAT_ITEMS } from "@/lib/hub-items";

export default function CombatHubPage() {
  const year = useGbYear();
  return (
    <ModuleHub
      key={year}
      title="Combat"
      orderColumn="combat_order"
      items={withGbYear(COMBAT_ITEMS, year)}
    />
  );
}
