import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { buildAiSettingsEditDraft, getAiServiceSettingsAsync, saveAiServiceSettings } from "@/lib/image-generation-settings";
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
    const settings = await getAiServiceSettingsAsync();
    return NextResponse.json({
      settings,
      imageGeneration: settings.imageGeneration,
      sectionTemplateRecognition: settings.sectionTemplateRecognition,
      environmentKey: settings.environmentKey,
      source: settings.source,
      draft: buildAiSettingsEditDraft(settings)
    });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not load AI settings." }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.settings);
    const payload = await request.json().catch(() => ({}));
    await saveAiServiceSettings(user, payload);
    const settings = await getAiServiceSettingsAsync();
    return NextResponse.json({
      settings,
      imageGeneration: settings.imageGeneration,
      sectionTemplateRecognition: settings.sectionTemplateRecognition,
      environmentKey: settings.environmentKey,
      source: settings.source,
      draft: buildAiSettingsEditDraft(settings)
    });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not save AI settings." }, { status: 400 });
  }
}
