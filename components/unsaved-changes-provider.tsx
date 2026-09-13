"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type Guard = {
  isDirty: boolean;
  onSave: () => Promise<void>;
};

type UnsavedChangesContextValue = {
  registerGuard: (guard: Guard | null) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
);

/**
 * Call from any page/panel that has a "form + save button" pattern. Pass the
 * current dirty state and a save function; while dirty, in-app link clicks
 * are intercepted app-wide (via UnsavedChangesProvider) with a choice to
 * save, discard, or cancel — and closing/refreshing the tab shows the
 * browser's native warning.
 */
export function useUnsavedChangesGuard(isDirty: boolean, onSave: () => Promise<void>) {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error(
      "useUnsavedChangesGuard must be used within UnsavedChangesProvider",
    );
  }

  useEffect(() => {
    ctx.registerGuard(isDirty ? { isDirty, onSave } : null);
    return () => ctx.registerGuard(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSave is re-created every render; only isDirty should re-register
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}

export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const guardRef = useRef<Guard | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const registerGuard = useCallback((guard: Guard | null) => {
    guardRef.current = guard;
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const guard = guardRef.current;
      if (!guard?.isDirty) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element).closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (href === window.location.pathname) return;

      e.preventDefault();
      setPendingHref(href);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  const handleDiscard = () => {
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  };

  const handleCancel = () => {
    setPendingHref(null);
  };

  const handleSaveAndContinue = async () => {
    const guard = guardRef.current;
    if (!guard) return;
    setIsSaving(true);
    try {
      await guard.onSave();
      if (pendingHref) router.push(pendingHref);
      setPendingHref(null);
    } catch {
      alert("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <UnsavedChangesContext.Provider value={{ registerGuard }}>
      {children}
      {pendingHref && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCancel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
          >
            <h2 className="font-semibold text-foreground">
              Modifications non enregistrées
            </h2>
            <p className="text-sm text-foreground/70">
              Tu as des changements non enregistrés sur cette page. Veux-tu
              les enregistrer avant de continuer ?
            </p>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-white/[.145] dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Abandonner les changements
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Enregistrement…" : "Enregistrer et continuer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  );
}
