import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAiServiceSettings } from "@/lib/image-generation-settings";
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

export async function GET() {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.settings);
    const settings = getAiServiceSettings();
    return NextResponse.json({
      settings,
      imageGeneration: settings.imageGeneration,
      sectionTemplateRecognition: settings.sectionTemplateRecognition
    });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not load AI settings." }, { status: 400 });
  }
}
