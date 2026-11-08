"use client";

import ModuleHub from "@/components/module-hub";
import { withGbYear } from "@/lib/gb-years";
import { useGbYear } from "@/lib/use-gb-year";
import { OUTILS_ITEMS } from "@/lib/hub-items";

export default function OutilsPage() {
  const year = useGbYear();
  return (
    <ModuleHub
      key={year}
      title="Outils"
      orderColumn="outils_order"
      items={withGbYear(OUTILS_ITEMS, year)}
    />
  );
}
