"use client";

import { Suspense } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import DocumentBrowser from "@/components/document-browser";
import RequireFeature from "@/components/require-feature";

export default function DocumentsPage() {
  return (
    <RequireFeature feature="documents">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Gestion documentaire
        </h1>
        <Breadcrumb />
        <Suspense
          fallback={<p className="mt-6 text-sm text-foreground/60">Chargement…</p>}
        >
          <DocumentBrowser
            moduleKey="documents"
            basePath="/campagnes/documents"
            showLinking
          />
        </Suspense>
      </div>
    </RequireFeature>
  );
}
