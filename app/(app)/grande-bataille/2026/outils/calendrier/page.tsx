"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import CalendarPanel from "@/components/calendar-panel";
import RequireFeature from "@/components/require-feature";

export default function OutilsCalendrierPage() {
  return (
    <RequireFeature feature="calendrier">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Calendrier
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <CalendarPanel coordinationKey="outils" moduleKey="calendrier" />
        </div>
      </div>
    </RequireFeature>
  );
}
