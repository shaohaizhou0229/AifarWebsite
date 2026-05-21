import { NextResponse } from "next/server";
import { getAccountSecurityContext } from "@/lib/account-security";
import { AccountInactiveError, AuthConfigurationError, AuthRequiredError, setAuthCookies } from "@/lib/auth";

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
  return NextResponse.json({ errorCode: error.code || "security_load_failed" }, { status: 500 });
}

export async function GET() {
  try {
    const context = await getAccountSecurityContext();
    const response = NextResponse.json({ security: context.security });
    setAuthCookies(response, context.session);
    return response;
  } catch (error) {
    return securityError(error);
  }
}
