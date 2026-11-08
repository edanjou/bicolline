"use client";

import { useParams } from "next/navigation";
import CoordinationHub from "@/components/coordination-hub";
import RequireFeature from "@/components/require-feature";
import { coordinationLabel } from "@/lib/hub-items";
import { gbPath } from "@/lib/gb-years";
import { useGbYear } from "@/lib/use-gb-year";

export default function CoordinationPage() {
  const { coordination } = useParams<{ coordination: string }>();
  const year = useGbYear();

  return (
    <RequireFeature feature={coordination}>
      <CoordinationHub
        title={coordinationLabel(coordination)}
        basePath={gbPath(year, coordination)}
      />
    </RequireFeature>
  );
}
