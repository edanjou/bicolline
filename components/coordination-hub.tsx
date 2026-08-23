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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Clock, ListChecks, NotebookPen, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { getOwnProfile, type Profile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { SortableHubCard, type HubItem } from "@/components/module-hub";

const DEFAULT_MODULES = [
  { slug: "volontaires", label: "Gestion des volontaires", icon: Users },
  { slug: "feuille-de-temps", label: "Feuille de temps", icon: Clock },
  { slug: "bilan", label: "Bilan", icon: NotebookPen },
  { slug: "choses-a-faire", label: "Choses à faire", icon: ListChecks },
];

export default function CoordinationHub({
  title,
  basePath,
  items,
}: {
  title: string;
  basePath: string;
  /** Defaults to the 4 generic modules (Volontaires/Feuille de temps/Bilan/
   * Choses à faire) resolved under basePath. */
  items?: HubItem[];
}) {
  const baseItems: HubItem[] =
    items ??
    DEFAULT_MODULES.map((m) => ({
      href: `${basePath}/${m.slug}`,
      label: m.label,
      icon: m.icon,
    }));

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orderedItems, setOrderedItems] = useState<HubItem[]>(baseItems);
  const [isLoading, setIsLoading] = useState(true);
  const suppressClickRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    getOwnProfile().then((p) => {
      setProfile(p);
      const saved = p?.misc_order?.[basePath] ?? null;
      if (saved) {
        const byHref = new Map(baseItems.map((item) => [item.href, item]));
        const ordered = saved
          .map((href) => byHref.get(href))
          .filter((item): item is HubItem => Boolean(item));
        const remaining = baseItems.filter(
          (item) => !saved.includes(item.href),
        );
        setOrderedItems([...ordered, ...remaining]);
      } else {
        setOrderedItems(baseItems);
      }
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- basePath/items are stable per page instance
  }, [basePath]);

  const handleDragStart = () => {
    suppressClickRef.current = true;
  };

  const releaseClickSuppression = () => {
    requestAnimationFrame(() => {
      suppressClickRef.current = false;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    releaseClickSuppression();
    if (!over || active.id === over.id) return;

    setOrderedItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.href === active.id);
      const toIndex = prev.findIndex((item) => item.href === over.id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = arrayMove(prev, fromIndex, toIndex);
      if (profile) {
        const nextMisc = {
          ...(profile.misc_order ?? {}),
          [basePath]: next.map((item) => item.href),
        };
        supabase
          .from("profiles")
          .update({ misc_order: nextMisc })
          .eq("id", profile.id)
          .then();
      }
      return next;
    });
  };

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        {title}
      </h1>
      <Breadcrumb />

      {isLoading ? (
        <p className="mt-8 text-sm text-foreground/60">Chargement…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={releaseClickSuppression}
        >
          <SortableContext
            items={orderedItems.map((i) => i.href)}
            strategy={rectSortingStrategy}
          >
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {orderedItems.map((item) => (
                <SortableHubCard
                  key={item.href}
                  item={item}
                  suppressClickRef={suppressClickRef}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
