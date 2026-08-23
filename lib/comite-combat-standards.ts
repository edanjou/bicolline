import type { DocumentBlock } from "@/lib/activity-document";
import { supabase } from "@/lib/supabase";

export async function listStandardsBlocks(): Promise<DocumentBlock[]> {
  const { data, error } = await supabase
    .from("comite_combat_standards_blocks")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveStandardsBlocks(
  blocks: DocumentBlock[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("comite_combat_standards_blocks")
    .delete()
    .not("id", "is", null);
  if (deleteError) throw deleteError;

  if (blocks.length === 0) return;

  const { error } = await supabase.from("comite_combat_standards_blocks").insert(
    blocks.map((block, index) => ({
      id: block.id,
      block_type: block.block_type,
      label: block.label,
      content: block.content,
      position: index,
    })),
  );
  if (error) throw error;
}
