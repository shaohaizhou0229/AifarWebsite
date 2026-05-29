import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getProfile } from "@/lib/profiles";
import recognitionRules from "@/lib/section-template-recognition.cjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const {
  RECOGNITION_TIMEOUT_CODE,
  RECOGNITION_UNAVAILABLE_CODE,
  buildOpenAIRecognitionPayload,
  createUatRecognitionOutput,
  createDataUrl,
  extractResponseJson,
  getSectionTemplateRecognitionSettings,
  normalizeRecognitionCandidate,
  normalizeRecognitionRequestFields,
  validateScreenshotFileInput
} = recognitionRules;

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

async function requestRecognizedSection({ dataUrl, fields, settings }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
  let response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildOpenAIRecognitionPayload({
        model: settings.model,
        dataUrl,
        fields
      }))
    });
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message || "Section template recognition failed.");
    error.code = "recognition_failed";
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }

  return data;
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

    const settings = getSectionTemplateRecognitionSettings();
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
            enabled: settings.enabled,
            hasApiKey: settings.hasApiKey,
            hasModel: Boolean(settings.model),
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
