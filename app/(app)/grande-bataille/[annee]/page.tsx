"use client";

import ModuleHub from "@/components/module-hub";
import { withGbYear } from "@/lib/gb-years";
import { useGbYear } from "@/lib/use-gb-year";
import { GRANDE_BATAILLE_ITEMS } from "@/lib/hub-items";

export default function GrandeBatailleYearPage() {
  const year = useGbYear();
  return (
    <ModuleHub
      key={year}
      title={`Grande Bataille ${year}`}
      orderColumn="grande_bataille_order"
      items={withGbYear(GRANDE_BATAILLE_ITEMS, year)}
    />
  );
}
