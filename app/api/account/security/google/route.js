import { NextResponse } from "next/server";
import { unlinkGoogleIdentity } from "@/lib/account-security";
import { AccountInactiveError, AuthConfigurationError, AuthRequiredError, setAuthCookies } from "@/lib/auth";
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
  return NextResponse.json({ errorCode: error.code || "google_disconnect_failed" }, { status: 400 });
}

export async function DELETE() {
  try {
    const context = await unlinkGoogleIdentity();

    await recordUserFootprint({
      userId: context.user.id,
      actorUserId: context.user.id,
      eventType: USER_FOOTPRINT_EVENTS.googleUnlinked,
      summary: "User disconnected Google from their account.",
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
