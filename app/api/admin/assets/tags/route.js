import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { createProjectAssetTag } from "@/lib/project-assets";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

export async function POST(request) {
  try {
    const user = await requireAdmin(getProfile);
    const tag = await createProjectAssetTag(user, await request.json().catch(() => ({})));
    return NextResponse.json({ tag });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not create tag." }, { status: 400 });
  }
}
