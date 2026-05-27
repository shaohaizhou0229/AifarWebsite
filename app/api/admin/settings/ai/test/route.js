import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getImageGenerationSettings } from "@/lib/image-generation-settings";
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

export async function POST() {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.settings);
    const settings = getImageGenerationSettings();

    if (!settings.enabled) {
      return NextResponse.json({ ok: false, code: "disabled", error: "Image generation is disabled." }, { status: 400 });
    }
    if (!settings.hasApiKey || !settings.model) {
      return NextResponse.json({ ok: false, code: "missingConfig", error: "OpenAI image settings are incomplete." }, { status: 503 });
    }

    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(settings.model)}`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        code: "connectionFailed",
        error: data.error?.message || "OpenAI model check failed."
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      model: data.id || settings.model
    });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ ok: false, error: error.message || "Could not test AI settings." }, { status: 400 });
  }
}
