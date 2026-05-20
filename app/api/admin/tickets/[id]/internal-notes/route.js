import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/admin-permissions";
import { addInternalNote, getAdminTicket, getRequestWorkflow, normalizeText } from "@/lib/tickets";

export const runtime = "nodejs";

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

function assertTicketPermission(profile, ticket) {
  const workflow = getRequestWorkflow(ticket?.requestType);
  const permission = workflow === "support" ? ADMIN_PERMISSIONS.support : ADMIN_PERMISSIONS.contact;
  if (!hasAdminPermission(profile, permission)) {
    throw new AdminRequiredError("Administrator permission required.");
  }
}

export async function POST(request, { params }) {
  try {
    const { user, profile } = await requireAdmin(getProfile);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const message = normalizeText(payload.message);

    if (!message) {
      return NextResponse.json({ error: "Internal note is required." }, { status: 400 });
    }

    const detail = await getAdminTicket(id);
    if (!detail) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    assertTicketPermission(profile, detail.ticket);
    const note = await addInternalNote(id, user, message);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to add internal note." }, { status: 500 });
  }
}
