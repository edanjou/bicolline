import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Simple no-op query to keep the Supabase project active — the free tier
// pauses a project after 7 days with no API activity. Independent of the
// sync crons so it isn't affected if one of those starts failing.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").select("id").limit(1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", pingedAt: new Date().toISOString() });
}
