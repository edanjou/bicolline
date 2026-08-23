"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Map as MapIcon, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import RichTextEditor from "@/components/rich-text-editor";
import type { DocumentBlock } from "@/lib/activity-document";
import { uploadMedia } from "@/lib/media-library";

const MapEditor = dynamic(() => import("@/components/map-editor"), {
  ssr: false,
});

const fieldClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

export default function SortableDocumentBlockRow({
  block,
  title,
  onRemove,
  onLabelChange,
  onContentChange,
}: {
  block: DocumentBlock;
  title: string;
  onRemove: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onContentChange: (id: string, content: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isMapEditorOpen, setIsMapEditorOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadMedia(file, "cartes-terrain");
      onContentChange(block.id, uploaded.url);
    } catch {
      setUploadError("Échec du téléversement.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border border-black/[.08] p-3 dark:border-white/[.145] ${
        isDragging ? "relative z-10 opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Déplacer"
          className="cursor-grab touch-none text-foreground/40 hover:text-foreground/70"
        >
          <GripVertical size={14} />
        </button>
        {block.block_type === "custom_text" || block.block_type === "image" ? (
          <input
            type="text"
            value={block.label ?? ""}
            onChange={(e) => onLabelChange(block.id, e.target.value)}
            placeholder={
              block.block_type === "image"
                ? "Légende (optionnelle)"
                : "Titre du bloc (optionnel)"
            }
            className={`flex-1 ${fieldClassName}`}
          />
        ) : (
          <p className="flex-1 font-medium text-foreground">{title}</p>
        )}
        <button
          type="button"
          onClick={() => onRemove(block.id)}
          aria-label="Retirer"
          className="text-foreground/50 hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
      {block.block_type === "custom_text" && (
        <div className="mt-2">
          <RichTextEditor
            value={block.content ?? ""}
            onChange={(html) => onContentChange(block.id, html)}
            placeholder="Contenu du bloc…"
            minHeight="6rem"
          />
        </div>
      )}
      {block.block_type === "image" && (
        <div className="mt-2 flex flex-col gap-2">
          {block.content && (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a static asset
            <img
              src={block.content}
              alt={block.label ?? "Image"}
              className="max-h-64 rounded-lg border border-black/[.08] object-contain dark:border-white/[.145]"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              {isUploading
                ? "Téléversement…"
                : block.content
                  ? "Remplacer l'image"
                  : "Téléverser une image"}
            </label>
            <button
              type="button"
              onClick={() => setIsMapEditorOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              <MapIcon size={14} />
              Création de carte
            </button>
          </div>
          {uploadError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {uploadError}
            </p>
          )}
          {isMapEditorOpen && (
            <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
              <MapEditor
                embedded
                onCancel={() => setIsMapEditorOpen(false)}
                onAttach={({ url }) => {
                  onContentChange(block.id, url);
                  setIsMapEditorOpen(false);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
