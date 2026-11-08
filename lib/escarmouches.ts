import { supabase } from "@/lib/supabase";

export type Escarmouche = {
  id: string;
  name: string;
  date: string;
  created_at: string;
};

export type EscarmoucheInput = {
  name: string;
  date: string;
};

export async function listEscarmouches(year: number): Promise<Escarmouche[]> {
  const { data, error } = await supabase
    .from("escarmouches")
    .select("*")
    .eq("year", year)
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEscarmouche(
  year: number,
  input: EscarmoucheInput,
): Promise<void> {
  const { error } = await supabase
    .from("escarmouches")
    .insert({ ...input, year });
  if (error) throw error;
}

export async function updateEscarmouche(
  id: string,
  input: EscarmoucheInput,
): Promise<void> {
  const { error } = await supabase
    .from("escarmouches")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEscarmouche(id: string): Promise<void> {
  const { error } = await supabase.from("escarmouches").delete().eq("id", id);
  if (error) throw error;
}
