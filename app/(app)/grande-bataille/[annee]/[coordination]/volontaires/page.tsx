"use client";

import { useParams } from "next/navigation";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import VolunteersPanel from "@/components/volunteers-panel";
import { coordinationLabel } from "@/lib/hub-items";
import { useGbYear } from "@/lib/use-gb-year";

export default function CoordinationVolontairesPage() {
  const gbYear = useGbYear();
  const { coordination } = useParams<{ coordination: string }>();

  return (
    <RequireFeature feature={coordination}>
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Volontaires — {coordinationLabel(coordination)}
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <VolunteersPanel
            coordinationKey={coordination}
            moduleKey={coordination}
            year={gbYear}
          />
        </div>
      </div>
    </RequireFeature>
  );
}
