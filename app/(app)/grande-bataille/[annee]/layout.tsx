import { notFound } from "next/navigation";
import { Fragment } from "react";
import { isGbYear } from "@/lib/gb-years";

export default async function GrandeBatailleYearLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ annee: string }>;
}) {
  const { annee } = await params;
  if (!isGbYear(annee)) notFound();
  // Changer d'année remonte les pages : leurs données sont rechargées pour la
  // nouvelle édition.
  return <Fragment key={annee}>{children}</Fragment>;
}
