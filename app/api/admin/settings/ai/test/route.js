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
    missingConfig: "AI image settings are incomplete.",
    connectionFailed: "AI image model check failed."
  },
  [AI_SETTINGS_TEST_TARGETS.sectionTemplateRecognition]: {
    disabled: "AI section recognition is disabled.",
    missingConfig: "AI section recognition settings are incomplete.",
    connectionFailed: "AI section recognition model check failed."
  }
};

function providerApiKey(settings) {
  return settings.providerKey === "siliconflow"
    ? process.env.SILICONFLOW_API_KEY
    : process.env.OPENAI_API_KEY;
}

function modelIds(settings) {
  return Array.isArray(settings.modelIds) && settings.modelIds.length
    ? settings.modelIds
    : (settings.model ? [settings.model] : []);
}

function extractModelIds(data) {
  const models = Array.isArray(data?.data) ? data.data : [];
  return new Set(models.map((model) => String(model?.id || model?.name || "").trim()).filter(Boolean));
}

async function testOpenAIModel(settings, messages) {
  const model = modelIds(settings)[0];
  const response = await fetch(`${settings.baseUrl}/models/${encodeURIComponent(model)}`, {
    headers: {
      Authorization: `Bearer ${providerApiKey(settings)}`
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      code: "connectionFailed",
      error: data.error?.message || messages.connectionFailed,
      status: 400
    };
  }
  return { ok: true, model: data.id || model };
}

async function testSiliconFlowModels(settings, messages) {
  const response = await fetch(`${settings.baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${providerApiKey(settings)}`
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      code: "connectionFailed",
      error: data.error?.message || data.message || messages.connectionFailed,
      status: 400
    };
  }

  const availableModels = extractModelIds(data);
  const expectedModels = modelIds(settings);
  if (availableModels.size) {
    const missingModels = expectedModels.filter((model) => !availableModels.has(model));
    if (missingModels.length) {
      return {
        ok: false,
        code: "connectionFailed",
        error: `Configured model is not listed by ${settings.provider}: ${missingModels.join(", ")}`,
        status: 400
      };
    }
  }

  return { ok: true, model: expectedModels.join(" + ") };
}

async function testProviderConnection(settings, messages) {
  if (settings.providerKey === "siliconflow") {
    return testSiliconFlowModels(settings, messages);
  }
  return testOpenAIModel(settings, messages);
}

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

    const result = await testProviderConnection(settings, messages);
    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        target,
        code: result.code || "connectionFailed",
        error: result.error || messages.connectionFailed
      }, { status: result.status || 400 });
    }

    return NextResponse.json({
      ok: true,
      target,
      provider: settings.provider,
      providerKey: settings.providerKey,
      checkedAt: new Date().toISOString(),
      model: result.model || settings.model
    });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ ok: false, error: error.message || "Could not test AI settings." }, { status: 400 });
  }
}
