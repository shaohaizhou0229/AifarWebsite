import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { adminJson } from "@/lib/admin-response";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { createUserInvitation, getProfile, listAdminUsers } from "@/lib/profiles";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";
import { EMAIL_EVENTS, enqueueAndTrySend, getSiteUrl } from "@/lib/email";
import { buildInvitationEmail } from "@/lib/email/templates";
import { createNotificationsForPermission, NOTIFICATION_EVENTS } from "@/lib/notifications";

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

export async function GET(request) {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const url = new URL(request.url);
    const users = await listAdminUsers(url.searchParams.get("q") || "", url.searchParams.get("status") || "all", {
      limit: url.searchParams.get("limit") || 20,
      includeMetrics: url.searchParams.get("metrics") !== "deferred"
    });
    return adminJson({ users });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildRegisterUrl(email, locale = "zh-CN") {
  const safeLocale = typeof locale === "string" && locale.trim() ? locale.trim() : "zh-CN";
  const url = new URL(`/${safeLocale}/register/`, getSiteUrl());
  url.searchParams.set("email", email);
  return url.toString();
}

async function queueInvitationEmail(invitation, locale) {
  try {
    const email = buildInvitationEmail({
      invitation,
      registerUrl: buildRegisterUrl(invitation.email, locale)
    });

    const result = await enqueueAndTrySend({
      eventType: EMAIL_EVENTS.userInvitation,
      to: invitation.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      relatedType: "user_invitation",
      relatedId: invitation.id,
      metadata: { role: invitation.role }
    });

    return Boolean(result.queued);
  } catch (error) {
    console.error("Failed to queue invitation email", error);
    return false;
  }
}

export async function POST(request) {
  try {
    const { user: adminUser } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const payload = await request.json().catch(() => ({}));
    const invitation = await createUserInvitation({
      email: clean(payload.email),
      displayName: clean(payload.displayName),
      organization: clean(payload.organization),
      jobTitle: clean(payload.jobTitle),
      countryRegion: clean(payload.countryRegion),
      phone: clean(payload.phone),
      role: clean(payload.role),
      adminPermissions: Array.isArray(payload.adminPermissions) ? payload.adminPermissions : []
    }, adminUser.id);
    const emailQueued = await queueInvitationEmail(invitation, clean(payload.locale));

    await recordUserFootprint({
      userId: adminUser.id,
      actorUserId: adminUser.id,
      eventType: USER_FOOTPRINT_EVENTS.adminUserInvited,
      summary: "Administrator created a user invitation.",
      relatedType: "profile",
      metadata: { email: invitation.email, role: invitation.role }
    });
    await createNotificationsForPermission(ADMIN_PERMISSIONS.users, {
      eventType: NOTIFICATION_EVENTS.userInvitationCreated,
      title: "用户邀请已创建",
      body: `${invitation.email} 的账号邀请已创建。`,
      relatedType: "user_invitation",
      relatedId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
      url: "/zh-CN/admin/users/",
      sendEmail: false
    });

    return NextResponse.json({ invitation, emailQueued }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to invite user." }, { status: 500 });
  }
}
