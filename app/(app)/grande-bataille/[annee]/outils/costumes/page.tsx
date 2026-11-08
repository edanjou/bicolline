"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import CostumesPanel from "@/components/costumes-panel";
import RequireFeature from "@/components/require-feature";

export default function OutilsCostumesPage() {
  return (
    <RequireFeature feature="costumes">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Costumes et accessoires
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <CostumesPanel coordinationKey="outils" moduleKey="costumes" />
        </div>
      </div>
    </RequireFeature>
  );
}
