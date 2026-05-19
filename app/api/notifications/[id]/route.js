import { NextResponse } from "next/server";
import { AuthRequiredError, requireUser } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return null;
}

export async function PATCH(_request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const notification = await markNotificationRead(user.id, id);
    if (!notification) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }
    return NextResponse.json({ notification });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: "Unable to update notification." }, { status: 500 });
  }
}
