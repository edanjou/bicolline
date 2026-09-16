import { NextResponse } from "next/server";
import { syncSingleEventRegistrations } from "@/lib/bicolline-event-registrations-sync";
import { requireAdmin } from "@/lib/require-admin";

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let eventExternalId: unknown;
  try {
    ({ eventExternalId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (typeof eventExternalId !== "number") {
    return NextResponse.json(
      { error: "eventExternalId (nombre) requis." },
      { status: 400 },
    );
  }

  try {
    const result = await syncSingleEventRegistrations(eventExternalId);
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("sync-single-event-registrations failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Échec de la synchronisation.",
      },
      { status: 500 },
    );
  }
}
