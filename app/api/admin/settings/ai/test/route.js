import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import aiServiceSettings from "@/lib/ai-service-settings.cjs";
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

const {
  AI_SETTINGS_TEST_TARGETS,
  getAiServiceSettings,
  normalizeAiSettingsTestTarget
} = aiServiceSettings;

const TARGET_MESSAGES = {
  [AI_SETTINGS_TEST_TARGETS.imageGeneration]: {
    disabled: "Image generation is disabled.",
    missingConfig: "OpenAI image settings are incomplete.",
    connectionFailed: "OpenAI image model check failed."
  },
  [AI_SETTINGS_TEST_TARGETS.sectionTemplateRecognition]: {
    disabled: "AI section recognition is disabled.",
    missingConfig: "OpenAI section recognition settings are incomplete.",
    connectionFailed: "OpenAI section recognition model check failed."
  }
};

export async function POST(request) {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.settings);
    const payload = await request.json().catch(() => ({}));
    const target = normalizeAiSettingsTestTarget(payload.target);
    const settings = getAiServiceSettings()[target];
    const messages = TARGET_MESSAGES[target];

    if (target === AI_SETTINGS_TEST_TARGETS.sectionTemplateRecognition && settings.uatModeEnabled) {
      return NextResponse.json({
        ok: true,
        target,
        mode: "uat",
        checkedAt: new Date().toISOString(),
        model: "local-uat-section-template"
      });
    }

    if (!settings.enabled) {
      return NextResponse.json({ ok: false, target, code: "disabled", error: messages.disabled }, { status: 400 });
    }
    if (!settings.hasApiKey || !settings.model) {
      return NextResponse.json({ ok: false, target, code: "missingConfig", error: messages.missingConfig }, { status: 503 });
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
        target,
        code: "connectionFailed",
        error: data.error?.message || messages.connectionFailed
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      target,
      checkedAt: new Date().toISOString(),
      model: data.id || settings.model
    });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ ok: false, error: error.message || "Could not test AI settings." }, { status: 400 });
  }
}
