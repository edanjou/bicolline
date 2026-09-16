import { NextResponse } from "next/server";
import { syncEvents } from "@/lib/bicolline-events-sync";
import { requireAdmin } from "@/lib/require-admin";

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const result = await syncEvents({ force: true });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("sync-events failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Échec de la synchronisation.",
      },
      { status: 500 },
    );
  }
}
