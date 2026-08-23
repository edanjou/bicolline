"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import DocumentBrowser from "@/components/document-browser";
import RequireFeature from "@/components/require-feature";

export default function ComiteCombatProceduresPage() {
  return (
    <RequireFeature feature="comite-combat">
      <div>
        <Link
          href="/comite-combat"
          className="flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Comité Combat
        </Link>
        <h1 className={`${glofters.className} mt-2 text-3xl text-foreground`}>
          Procédures
        </h1>
        <Breadcrumb />
        <Suspense
          fallback={<p className="mt-6 text-sm text-foreground/60">Chargement…</p>}
        >
          <DocumentBrowser
            moduleKey="comite-combat"
            rootPrefix="comite-combat/procedures"
            basePath="/comite-combat/procedures"
          />
        </Suspense>
      </div>
    </RequireFeature>
  );
}
