import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminUser, getProfile, softDeleteAdminUser, updateAdminUserProfile } from "@/lib/profiles";
import { listAdminTicketsForUser } from "@/lib/tickets";
import { listUserFootprints, recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";
import { createNotificationsForPermission, NOTIFICATION_EVENTS } from "@/lib/notifications";

export const runtime = "nodejs";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

export async function GET(_request, { params }) {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const { id } = await params;
    const user = await getAdminUser(id);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const [tickets, footprints] = await Promise.all([
      listAdminTicketsForUser(user),
      listUserFootprints(user.id)
    ]);

    return NextResponse.json({ user, tickets, footprints });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load user." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { user: adminUser } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const user = await updateAdminUserProfile(id, {
      displayName: clean(payload.displayName),
      organization: clean(payload.organization),
      jobTitle: clean(payload.jobTitle),
      countryRegion: clean(payload.countryRegion),
      phone: clean(payload.phone),
      role: clean(payload.role),
      accountStatus: clean(payload.accountStatus),
      adminPermissions: Array.isArray(payload.adminPermissions) ? payload.adminPermissions : []
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await recordUserFootprint({
      userId: id,
      actorUserId: adminUser.id,
      eventType: USER_FOOTPRINT_EVENTS.adminUserUpdated,
      summary: "Administrator updated user profile or role.",
      relatedType: "profile",
      relatedId: id,
      metadata: { role: user.role, accountStatus: user.accountStatus, adminPermissions: user.adminPermissions }
    });
    await createNotificationsForPermission(ADMIN_PERMISSIONS.users, {
      eventType: NOTIFICATION_EVENTS.userUpdated,
      title: "用户资料已更新",
      body: `${user.displayName || user.email} 的账号资料或权限已更新。`,
      relatedType: "profile",
      relatedId: id,
      metadata: { role: user.role, accountStatus: user.accountStatus },
      url: `/zh-CN/admin/users/${id}/`,
      sendEmail: false
    });

    return NextResponse.json({ user });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to update user." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { user: adminUser } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const user = await softDeleteAdminUser(id, adminUser.id, clean(payload.reason) || "Deleted by administrator.");

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await recordUserFootprint({
      userId: id,
      actorUserId: adminUser.id,
      eventType: USER_FOOTPRINT_EVENTS.adminUserDeleted,
      summary: "Administrator deleted user account.",
      relatedType: "profile",
      relatedId: id,
      metadata: { reason: clean(payload.reason) || null }
    });
    await createNotificationsForPermission(ADMIN_PERMISSIONS.users, {
      eventType: NOTIFICATION_EVENTS.userDeleted,
      title: "用户账号已注销",
      body: `${user.displayName || user.email} 的账号已被管理员注销。`,
      relatedType: "profile",
      relatedId: id,
      metadata: { reason: clean(payload.reason) || null },
      url: `/zh-CN/admin/users/${id}/`,
      sendEmail: false
    });

    return NextResponse.json({ user });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to delete user." }, { status: 500 });
  }
}
