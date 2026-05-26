import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { listProjectAssets } from "@/lib/project-assets";
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

export async function GET(request) {
  try {
    await requireAdmin(getProfile);
    const searchParams = new URL(request.url).searchParams;
    const result = await listProjectAssets({
      q: searchParams.get("q") || "",
      directoryPath: searchParams.get("directory") || "",
      source: searchParams.get("source") || "",
      tag: searchParams.get("tag") || "",
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 24
    });
    return NextResponse.json(result);
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not list assets." }, { status: 400 });
  }
}
