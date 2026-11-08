"use client";

import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import ChecklistTab from "@/components/checklist-tab";
import RequireFeature from "@/components/require-feature";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import { useGbYear } from "@/lib/use-gb-year";

function GrandesBataillesContent() {
  const gbYear = useGbYear();
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["grandes-batailles"] === "ecriture");
      });
    });
  }, []);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Grandes Batailles
      </h1>
      <Breadcrumb />

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <ChecklistTab
          listKey="choses-a-faire"
          year={gbYear}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}

export default function GrandesBataillesPage() {
  return (
    <RequireFeature feature="grandes-batailles">
      <GrandesBataillesContent />
    </RequireFeature>
  );
}
