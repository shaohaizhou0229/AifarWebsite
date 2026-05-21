import { NextResponse } from "next/server";
import { getAccountSecurityContext, updateAccountPassword } from "@/lib/account-security";
import { AccountInactiveError, AuthConfigurationError, AuthRequiredError, setAuthCookies } from "@/lib/auth";
import coreRules from "@/lib/core-rules.cjs";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function securityError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ errorCode: "auth_required" }, { status: 401 });
  }
  if (error instanceof AccountInactiveError) {
    return NextResponse.json({ errorCode: "account_inactive" }, { status: 403 });
  }
  if (error instanceof AuthConfigurationError) {
    return NextResponse.json({ errorCode: "auth_service_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ errorCode: error.code || "password_update_failed" }, { status: 400 });
}

export async function PATCH(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const current = await getAccountSecurityContext();
    const input = coreRules.normalizePasswordInput(payload, {
      requireCurrentPassword: current.security.hasEmailIdentity
    });
    const context = await updateAccountPassword(input);

    await recordUserFootprint({
      userId: context.user.id,
      actorUserId: context.user.id,
      eventType: USER_FOOTPRINT_EVENTS.passwordUpdated,
      summary: "User updated their account password.",
      relatedType: "profile",
      relatedId: context.user.id
    });

    const response = NextResponse.json({ ok: true, security: context.security });
    setAuthCookies(response, context.session);
    return response;
  } catch (error) {
    return securityError(error);
  }
}
