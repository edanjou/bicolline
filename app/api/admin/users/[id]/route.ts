import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

// Compte « super admin » (combatgb) — protégé contre toute suppression par
// un autre admin ; seul son propre titulaire peut le supprimer.
const SUPER_ADMIN_ID = "b1b21bb0-ed2c-4fc1-95b5-2f9c14156c3a";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const { admin, adminUserId } = auth;
  const { id } = await params;

  if (id === adminUserId) {
    return NextResponse.json(
      { error: "Tu ne peux pas supprimer ton propre compte." },
      { status: 400 },
    );
  }

  if (id === SUPER_ADMIN_ID && adminUserId !== SUPER_ADMIN_ID) {
    return NextResponse.json(
      { error: "Ce compte est protégé et ne peut être modifié que par son titulaire." },
      { status: 403 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
