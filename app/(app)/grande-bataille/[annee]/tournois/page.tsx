"use client";

import { Clock, ListChecks, NotebookPen, Users } from "lucide-react";
import HelmetIcon from "@/components/helmet-icon";
import CoordinationHub from "@/components/coordination-hub";
import type { HubItem } from "@/components/module-hub";
import RequireFeature from "@/components/require-feature";
import { withGbYear } from "@/lib/gb-years";
import { useGbYear } from "@/lib/use-gb-year";

const BASE_PATH = "/grande-bataille/[annee]/tournois";

const TOURNOIS_ITEMS: HubItem[] = [
  { href: `${BASE_PATH}/volontaires`, label: "Volontaires", icon: Users },
  {
    href: `${BASE_PATH}/feuille-de-temps`,
    label: "Feuille de temps",
    icon: Clock,
  },
  { href: `${BASE_PATH}/bilan`, label: "Bilan", icon: NotebookPen },
  {
    href: `${BASE_PATH}/choses-a-faire`,
    label: "Choses à faire",
    icon: ListChecks,
  },
  { href: `${BASE_PATH}/taktika`, label: "Taktika", icon: HelmetIcon },
];

export default function TournoisPage() {
  const year = useGbYear();
  return (
    <RequireFeature feature="tournois">
      <CoordinationHub
        title="Tournois"
        basePath={withGbYear([{ href: BASE_PATH }], year)[0].href}
        items={withGbYear(TOURNOIS_ITEMS, year)}
      />
    </RequireFeature>
  );
}
