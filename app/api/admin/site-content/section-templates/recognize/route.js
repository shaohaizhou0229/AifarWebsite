import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getSectionTemplateRecognitionSettingsAsync } from "@/lib/image-generation-settings";
import { getProfile } from "@/lib/profiles";
import recognitionRules from "@/lib/section-template-recognition.cjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const {
  RECOGNITION_TIMEOUT_CODE,
  RECOGNITION_UNAVAILABLE_CODE,
  buildOpenAIRecognitionPayload,
  buildSiliconFlowTemplatePayload,
  buildSiliconFlowVisionPayload,
  createUatRecognitionOutput,
  createDataUrl,
  extractChatCompletionText,
  extractResponseJson,
  normalizeRecognitionCandidate,
  normalizeRecognitionRequestFields,
  validateScreenshotFileInput
} = recognitionRules;

const AI_PROVIDER_KEYS = {
  openai: "openai",
  siliconflow: "siliconflow"
};

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

function normalizeFileMetadata(file) {
  return {
    filename: String(file?.name || "").trim().slice(0, 180),
    mimeType: String(file?.type || "").trim().slice(0, 80),
    size: Number(file?.size || 0)
  };
}

async function fetchRecognitionJson({ url, apiKey, body, signal }) {
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message || data.message || "Section template recognition failed.");
    error.code = "recognition_failed";
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }

  return data;
}

async function requestOpenAIRecognizedSection({ dataUrl, fields, settings, signal }) {
  return fetchRecognitionJson({
    url: `${settings.baseUrl}/responses`,
    apiKey: settings.apiKey,
    signal,
    body: buildOpenAIRecognitionPayload({
      model: settings.model,
      dataUrl,
      fields
    })
  });
}

async function requestSiliconFlowRecognizedSection({ dataUrl, fields, settings, signal }) {
  const visionResponse = await fetchRecognitionJson({
    url: `${settings.baseUrl}/chat/completions`,
    apiKey: settings.apiKey,
    signal,
    body: buildSiliconFlowVisionPayload({
      model: settings.visionModel,
      dataUrl,
      fields
    })
  });
  const visionSummary = extractChatCompletionText(visionResponse);
  if (!visionSummary) {
    const error = new Error("Section screenshot analysis did not return text.");
    error.code = "invalid_recognition_response";
    error.status = 400;
    throw error;
  }

  return fetchRecognitionJson({
    url: `${settings.baseUrl}/chat/completions`,
    apiKey: settings.apiKey,
    signal,
    body: buildSiliconFlowTemplatePayload({
      model: settings.textModel,
      visionSummary,
      fields
    })
  });
}

async function requestRecognizedSection({ dataUrl, fields, settings }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);

  try {
    if (settings.providerKey === AI_PROVIDER_KEYS.siliconflow) {
      return await requestSiliconFlowRecognizedSection({ dataUrl, fields, settings, signal: controller.signal });
    }
    return await requestOpenAIRecognizedSection({ dataUrl, fields, settings, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("AI section recognition timed out.");
      timeoutError.code = RECOGNITION_TIMEOUT_CODE;
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request) {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const formData = await request.formData();
    const screenshot = formData.get("screenshot");
    const screenshotValidation = validateScreenshotFileInput(screenshot);

    if (!screenshotValidation.ok) {
      return NextResponse.json(
        { error: screenshotValidation.message, code: screenshotValidation.code },
        { status: 400 }
      );
    }

    const settings = await getSectionTemplateRecognitionSettingsAsync({ includeSecret: true });
    const fields = normalizeRecognitionRequestFields({
      locale: formData.get("locale"),
      pageKey: formData.get("pageKey"),
      industry: formData.get("industry"),
      sectionTypeHint: formData.get("sectionTypeHint"),
      purposeHint: formData.get("purposeHint")
    });

    if (settings.uatModeEnabled) {
      return NextResponse.json(
        createUatRecognitionOutput(fields, normalizeFileMetadata(screenshot))
      );
    }

    if (!settings.configured) {
      return NextResponse.json(
        {
          error: "AI section recognition is not configured.",
          code: RECOGNITION_UNAVAILABLE_CODE,
          details: {
            provider: settings.provider,
            providerKey: settings.providerKey,
            enabled: settings.enabled,
            hasApiKey: settings.hasApiKey,
            hasModel: Boolean(settings.model),
            hasVisionModel: Boolean(settings.visionModel),
            hasTextModel: Boolean(settings.textModel),
            uatModeRequested: settings.uatModeRequested,
            uatModeAvailable: settings.uatModeAvailable,
            uatModeEnabled: settings.uatModeEnabled
          }
        },
        { status: 503 }
      );
    }

    const buffer = Buffer.from(await screenshot.arrayBuffer());
    const dataUrl = createDataUrl(buffer, screenshot.type);
    const responseJson = await requestRecognizedSection({ dataUrl, fields, settings });
    const result = extractResponseJson(responseJson);
    const output = normalizeRecognitionCandidate(result, fields, normalizeFileMetadata(screenshot));

    return NextResponse.json(output);
  } catch (error) {
    const authResponse = permissionError(error);
    if (authResponse) return authResponse;

    return NextResponse.json(
      {
        error: error.message || "Section template recognition failed.",
        code: error.code || "recognition_failed"
      },
      { status: error.status || 400 }
    );
  }
}
