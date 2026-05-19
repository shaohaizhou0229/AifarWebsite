import { NextResponse } from "next/server";
import { AuthRequiredError, requireUser } from "@/lib/auth";
import { listNotifications, markAllNotificationsRead } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return null;
}

export async function GET(request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const notifications = await listNotifications(user.id, url.searchParams.get("limit") || 50);
    return NextResponse.json({ notifications });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await requireUser();
    const notifications = await markAllNotificationsRead(user.id);
    return NextResponse.json({ notifications });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
  }
}
