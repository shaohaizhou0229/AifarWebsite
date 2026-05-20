import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { adminJson } from "@/lib/admin-response";
import { listNotifications, markNotificationsRead } from "@/lib/notifications";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EVENT_PREFIXES = ["collaboration.", "contact.", "download.", "user."];
const ADMIN_EVENT_TYPES = new Set(["ticket.assigned"]);

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

function isAdminNotification(notification) {
  const url = String(notification.url || "");
  const eventType = String(notification.eventType || "");

  if (url.includes("/admin/")) return true;
  if (url.includes("/account/")) return false;
  return ADMIN_EVENT_TYPES.has(eventType) || ADMIN_EVENT_PREFIXES.some((prefix) => eventType.startsWith(prefix));
}

function filterNotifications(notifications, { scope, status }) {
  return notifications.filter((notification) => {
    if (scope !== "all" && !isAdminNotification(notification)) return false;
    if (status === "unread" && notification.readAt) return false;
    return true;
  });
}

export async function GET(request) {
  try {
    const { user } = await requireAdmin(getProfile);
    const searchParams = new URL(request.url).searchParams;
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 100);
    const scope = searchParams.get("scope") === "all" ? "all" : "admin";
    const status = searchParams.get("status") === "unread" ? "unread" : "all";
    const notifications = filterNotifications(await listNotifications(user.id, 100), { scope, status }).slice(0, limit);

    return adminJson({ notifications });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load admin notifications." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user } = await requireAdmin(getProfile);
    const searchParams = new URL(request.url).searchParams;
    const payload = await request.json().catch(() => ({}));
    const scope = searchParams.get("scope") === "all" ? "all" : "admin";
    const status = searchParams.get("status") === "unread" ? "unread" : "all";

    const visibleNotifications = filterNotifications(await listNotifications(user.id, 100), { scope, status });
    const visibleIds = new Set(visibleNotifications.map((notification) => notification.id));
    const ids = Array.isArray(payload.ids)
      ? payload.ids.filter((id) => visibleIds.has(id))
      : visibleNotifications.filter((notification) => !notification.readAt).map((notification) => notification.id);
    const notifications = await markNotificationsRead(user.id, ids);

    return adminJson({ notifications });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to update admin notifications." }, { status: 500 });
  }
}
