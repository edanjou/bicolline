import { supabase } from "@/lib/supabase";

export type CostumeStatus =
  | "En évaluation"
  | "En stock"
  | "À acheter"
  | "À réparer/modifier"
  | "Préparé"
  | "Autre"
  | "N/A";

export const COSTUME_STATUSES: CostumeStatus[] = [
  "En évaluation",
  "En stock",
  "À acheter",
  "À réparer/modifier",
  "Préparé",
  "Autre",
  "N/A",
];

export type CostumeSex = "M" | "F" | "Unisexe" | "N/A";

export const COSTUME_SEXES: CostumeSex[] = ["M", "F", "Unisexe", "N/A"];

export type CostumeItem = {
  id: string;
  coordination_key: string;
  description: string;
  quantity: string;
  status: CostumeStatus;
  sex: CostumeSex;
  size: string;
  materials: string;
  deadline: string;
  storage_location: string;
  required_location: string;
  needed_date: string | null;
  requested_by: string;
  event_coordination_id: string | null;
  sub_team: string;
};

const COSTUME_SELECT =
  "id, coordination_key, description, quantity, status, sex, size, materials, deadline, storage_location, required_location, needed_date, requested_by, event_coordination_id, sub_team";

export async function listCostumes(
  coordinationKey: string,
  year: number,
): Promise<CostumeItem[]> {
  const { data, error } = await supabase
    .from("costume_items")
    .select(COSTUME_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .order("description", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type CostumeItemInput = {
  description: string;
  quantity: string;
  status: CostumeStatus;
  sex: CostumeSex;
  size: string;
  materials: string;
  deadline: string;
  storage_location: string;
  required_location: string;
  needed_date: string | null;
  requested_by: string;
  event_coordination_id: string | null;
  sub_team: string;
};

export async function createCostume(
  coordinationKey: string,
  year: number,
  input: CostumeItemInput,
): Promise<CostumeItem> {
  const { data, error } = await supabase
    .from("costume_items")
    .insert({ coordination_key: coordinationKey, year, ...input })
    .select(COSTUME_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCostume(
  id: string,
  input: CostumeItemInput,
): Promise<void> {
  const { error } = await supabase
    .from("costume_items")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCostume(id: string): Promise<void> {
  const { error } = await supabase.from("costume_items").delete().eq("id", id);
  if (error) throw error;
}
