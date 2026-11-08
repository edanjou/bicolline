"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import SortableDocumentBlockRow from "@/components/document-block-row";
import RequireFeature from "@/components/require-feature";
import type { DocumentBlock } from "@/lib/activity-document";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import {
  listReglementBlocks,
  saveReglementBlocks,
} from "@/lib/taktika-reglements";
import { gbPath } from "@/lib/gb-years";
import { useGbYear } from "@/lib/use-gb-year";

function TaktikaReglementsContent() {
  const gbYear = useGbYear();
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [canWrite, setCanWrite] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["tournois"] === "ecriture");
      });
    });
    listReglementBlocks()
      .then((saved) => {
        setBlocks(
          saved.length > 0
            ? saved
            : [
                {
                  id: crypto.randomUUID(),
                  block_type: "custom_text",
                  chapter_id: null,
                  label: "",
                  content: "",
                  position: 0,
                },
              ],
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const addTextBlock = () => {
    if (!canWrite) return;
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        block_type: "custom_text",
        chapter_id: null,
        label: "",
        content: "",
        position: prev.length,
      },
    ]);
  };

  const addImageBlock = () => {
    if (!canWrite) return;
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        block_type: "image",
        chapter_id: null,
        label: "",
        content: "",
        position: prev.length,
      },
    ]);
  };

  const removeBlock = (id: string) => {
    if (!canWrite) return;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBlockLabel = (id: string, label: string) => {
    if (!canWrite) return;
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)));
  };

  const updateBlockContent = (id: string, content: string) => {
    if (!canWrite) return;
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const fromIndex = prev.findIndex((b) => b.id === active.id);
      const toIndex = prev.findIndex((b) => b.id === over.id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      return arrayMove(prev, fromIndex, toIndex);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveReglementBlocks(blocks);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <Link
        href={gbPath(gbYear, "tournois/taktika")}
        className="flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Taktika
      </Link>
      <h1 className={`${glofters.className} mt-2 text-3xl text-foreground`}>
        Gestion des règlements
      </h1>
      <Breadcrumb />

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {isLoading ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3">
                  {blocks.map((block) => (
                    <SortableDocumentBlockRow
                      key={block.id}
                      block={block}
                      title="Bloc"
                      onRemove={removeBlock}
                      onLabelChange={updateBlockLabel}
                      onContentChange={updateBlockContent}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {canWrite && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={addTextBlock}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Plus size={14} />
                  Ajouter un bloc de texte
                </button>
                <button
                  type="button"
                  onClick={addImageBlock}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Plus size={14} />
                  Ajouter une image
                </button>
              </div>
            )}

            {canWrite && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isSaving ? "Enregistrement…" : "Enregistrer"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function TaktikaReglementsPage() {
  return (
    <RequireFeature feature="tournois">
      <TaktikaReglementsContent />
    </RequireFeature>
  );
}
