"use client";

import { useParams } from "next/navigation";
import { CURRENT_GB_YEAR, isGbYear } from "@/lib/gb-years";

// Année de la page courante (/grande-bataille/[annee]/…).
export function useGbYear(): number {
  const { annee } = useParams<{ annee?: string }>();
  return isGbYear(annee) ? Number(annee) : CURRENT_GB_YEAR;
}
