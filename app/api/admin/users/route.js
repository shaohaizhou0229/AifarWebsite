import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile, listAdminUsers } from "@/lib/profiles";

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
    await requireAdmin(getProfile);
    const url = new URL(request.url);
    const users = await listAdminUsers(url.searchParams.get("q") || "");
    return NextResponse.json({ users });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}
