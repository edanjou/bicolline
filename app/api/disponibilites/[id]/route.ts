import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const ANSWERS = new Set(["yes", "maybe", "no"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulaire public : renvoie le sondage et ses plages, jamais les réponses.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = createAdminClient();

  const [pollRes, slotsRes] = await Promise.all([
    admin
      .from("availability_polls")
      .select("id, title, description, location, is_open")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("availability_poll_slots")
      .select("id, date, start_time, end_time, position")
      .eq("poll_id", id)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  if (pollRes.error || slotsRes.error) {
    return NextResponse.json(
      { error: "Impossible de charger le sondage." },
      { status: 500 },
    );
  }
  if (!pollRes.data) {
    return NextResponse.json(
      { error: "Sondage introuvable." },
      { status: 404 },
    );
  }

  return NextResponse.json({ poll: pollRes.data, slots: slotsRes.data ?? [] });
}

// Une seule réponse par courriel : répondre à nouveau remplace la réponse précédente.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: {
    name?: unknown;
    email?: unknown;
    comment?: unknown;
    answers?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase().slice(0, 200)
      : "";
  const comment =
    typeof body.comment === "string"
      ? body.comment.trim().slice(0, 1000) || null
      : null;
  const answers =
    body.answers && typeof body.answers === "object"
      ? (body.answers as Record<string, unknown>)
      : null;

  if (!name || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Nom ou courriel manquant ou invalide." },
      { status: 400 },
    );
  }
  if (!answers) {
    return NextResponse.json(
      { error: "Réponses manquantes." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: poll, error: pollError } = await admin
    .from("availability_polls")
    .select("id, is_open")
    .eq("id", id)
    .maybeSingle();
  if (pollError || !poll) {
    return NextResponse.json(
      { error: "Sondage introuvable." },
      { status: 404 },
    );
  }
  if (!poll.is_open) {
    return NextResponse.json(
      { error: "Ce sondage est fermé." },
      { status: 409 },
    );
  }

  const { data: slots, error: slotsError } = await admin
    .from("availability_poll_slots")
    .select("id")
    .eq("poll_id", id);
  if (slotsError) {
    return NextResponse.json(
      { error: "Échec de l'enregistrement." },
      { status: 500 },
    );
  }

  const answerRows = (slots ?? []).map((slot) => {
    const answer = answers[slot.id];
    return {
      slot_id: slot.id,
      answer: typeof answer === "string" && ANSWERS.has(answer) ? answer : "no",
    };
  });

  const { data: response, error: responseError } = await admin
    .from("availability_poll_responses")
    .upsert(
      {
        poll_id: id,
        name,
        email,
        comment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "poll_id,email" },
    )
    .select("id")
    .single();
  if (responseError || !response) {
    return NextResponse.json(
      { error: "Échec de l'enregistrement." },
      { status: 500 },
    );
  }

  const { error: deleteError } = await admin
    .from("availability_poll_answers")
    .delete()
    .eq("response_id", response.id);
  if (deleteError) {
    return NextResponse.json(
      { error: "Échec de l'enregistrement." },
      { status: 500 },
    );
  }

  if (answerRows.length > 0) {
    const { error: insertError } = await admin
      .from("availability_poll_answers")
      .insert(answerRows.map((a) => ({ ...a, response_id: response.id })));
    if (insertError) {
      return NextResponse.json(
        { error: "Échec de l'enregistrement." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
