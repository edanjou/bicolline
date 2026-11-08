"use client";

import { useParams } from "next/navigation";
import BilanPanel from "@/components/bilan-panel";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import { coordinationLabel } from "@/lib/hub-items";
import { useGbYear } from "@/lib/use-gb-year";

export default function CoordinationBilanPage() {
  const gbYear = useGbYear();
  const { coordination } = useParams<{ coordination: string }>();

  return (
    <RequireFeature feature={coordination}>
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Bilan — {coordinationLabel(coordination)}
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <BilanPanel
            coordinationKey={coordination}
            moduleKey={coordination}
            year={gbYear}
          />
        </div>
      </div>
    </RequireFeature>
  );
}
