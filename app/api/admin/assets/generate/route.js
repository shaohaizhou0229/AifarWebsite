import { NextResponse } from "next/server";
import {
  AdminRequiredError,
  AuthRequiredError,
  createUserSupabaseClient,
  getCurrentAccessToken,
  requireAdminPermission
} from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import {
  MAX_PROJECT_ASSET_SIZE,
  PROJECT_ASSET_BUCKET,
  createProjectAssetRecord,
  createProjectAssetStoragePath
} from "@/lib/project-assets";
import {
  getImageGenerationSettings,
  normalizeImageOutputFormat,
  normalizeImageQuality,
  normalizeImageSize
} from "@/lib/image-generation-settings";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

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

function normalizePrompt(value) {
  return String(value || "").trim().slice(0, 1200);
}

function normalizePromptMode(value) {
  return value === "section_context" ? "section_context" : "manual";
}

function normalizePromptContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const fields = Array.isArray(value.fields)
    ? value.fields.slice(0, 12).map((field) => ({
      label: String(field?.label || "").trim().slice(0, 80),
      value: String(field?.value || "").trim().slice(0, 220)
    })).filter((field) => field.label && field.value)
    : [];

  return {
    pageKey: String(value.pageKey || "").trim().slice(0, 80),
    locale: String(value.locale || "").trim().slice(0, 32),
    sectionId: String(value.sectionId || "").trim().slice(0, 120),
    sectionType: String(value.sectionType || "").trim().slice(0, 80),
    sectionVariant: String(value.sectionVariant || "").trim().slice(0, 80),
    pathKey: String(value.pathKey || "").trim().slice(0, 80),
    size: String(value.size || "").trim().slice(0, 32),
    sizeSource: String(value.sizeSource || "").trim().slice(0, 40),
    fields
  };
}

async function fetchGeneratedImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Generated image could not be downloaded.");
  }
  return Buffer.from(await response.arrayBuffer());
}

async function requestGeneratedImage({ prompt, size, quality, outputFormat }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const settings = getImageGenerationSettings();
  const model = settings.model;

  if (!settings.enabled || !apiKey || !model) {
    const error = new Error("Image generation is not configured.");
    error.code = "generationUnavailable";
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      n: 1,
      output_format: outputFormat
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || "Image generation failed.");
  }

  const image = data.data?.[0];
  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }
  if (image?.url) {
    return fetchGeneratedImage(image.url);
  }
  throw new Error("Image generation did not return an image.");
}

export async function POST(request) {
  try {
    const [{ user }, accessToken] = await Promise.all([requireAdminPermission(getProfile, ADMIN_PERMISSIONS.assets), getCurrentAccessToken()]);
    if (!accessToken) {
      return NextResponse.json({ error: "A valid admin session is required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const prompt = normalizePrompt(body.prompt);
    const promptMode = normalizePromptMode(body.promptMode);
    const promptContext = normalizePromptContext(body.promptContext);
    const promptSupplement = normalizePrompt(body.promptSupplement).slice(0, 600);
    const size = normalizeImageSize(body.size, normalizeImageSize(process.env.OPENAI_IMAGE_DEFAULT_SIZE, "1024x1024"));
    const quality = normalizeImageQuality(body.quality, normalizeImageQuality(process.env.OPENAI_IMAGE_DEFAULT_QUALITY, "auto"));
    const outputFormat = normalizeImageOutputFormat(body.outputFormat, normalizeImageOutputFormat(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "webp"));

    if (!prompt) {
      return NextResponse.json({ error: "Image prompt is required." }, { status: 400 });
    }

    const buffer = await requestGeneratedImage({ prompt, size, quality, outputFormat });
    if (!buffer.length || buffer.length > MAX_PROJECT_ASSET_SIZE) {
      return NextResponse.json({ error: "Generated image is larger than 5 MB. Try a lower quality setting." }, { status: 400 });
    }

    const extension = outputFormat === "jpeg" ? "jpg" : outputFormat;
    const storagePath = createProjectAssetStoragePath("generated", `generated.${extension}`);
    const mimeType = outputFormat === "jpeg" ? "image/jpeg" : `image/${outputFormat}`;
    const supabase = createUserSupabaseClient(accessToken);
    const { error } = await supabase.storage
      .from(PROJECT_ASSET_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(error.message);
    }

    const asset = await createProjectAssetRecord(user, {
      storagePath,
      originalFilename: `generated-${Date.now()}.${extension}`,
      displayName: prompt.slice(0, 80),
      directoryPath: "generated",
      mimeType,
      fileSize: buffer.length,
      source: "generated",
      altText: prompt.slice(0, 300),
      tags: ["generated"],
      metadata: {
        prompt,
        promptMode,
        promptSupplement,
        promptContext,
        size,
        quality,
        outputFormat,
        model: process.env.OPENAI_IMAGE_MODEL
      }
    });

    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: "asset.generated",
      summary: "Administrator generated a project asset.",
      relatedType: "project_asset",
      relatedId: asset.id,
      metadata: {
        size,
        quality,
        outputFormat,
        promptMode,
        pageKey: promptContext?.pageKey || "",
        sectionId: promptContext?.sectionId || ""
      }
    });

    return NextResponse.json({ asset });
  } catch (error) {
    const unavailable = error.code === "generationUnavailable";
    return permissionError(error) || NextResponse.json(
      { error: error.message || "Could not generate image.", code: error.code || "" },
      { status: unavailable ? 503 : 400 }
    );
  }
}
