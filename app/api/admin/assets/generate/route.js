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
  createProjectAssetFolder,
  createProjectAssetRecord,
  createProjectAssetStoragePath,
  createProjectAssetTag,
  normalizeAssetDirectory,
  normalizeAssetTags
} from "@/lib/project-assets";
import {
  buildOpenAIImagePayload,
  buildSiliconFlowImagePayload,
  closestImageSizeForSpec,
  getImageGenerationSettings,
  normalizeImageOutputFormat,
  normalizeImageQuality,
  normalizeImageSize,
  normalizeTargetDimension
} from "@/lib/image-generation-settings";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function normalizePrompt(value) {
  return String(value || "").trim().slice(0, 1200);
}

function normalizePromptMode(value) {
  return value === "section_context" ? "section_context" : "manual";
}

function normalizeSizeSource(value, fallback = "serviceDefault") {
  return String(value || fallback || "serviceDefault").trim().slice(0, 40);
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

function mimeTypeForOutputFormat(format) {
  return format === "jpeg" ? "image/jpeg" : `image/${format}`;
}

function outputFormatFromMimeType(mimeType, fallback = "webp") {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("image/png")) return "png";
  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) return "jpeg";
  if (normalized.includes("image/webp")) return "webp";
  return fallback;
}

async function fetchGeneratedImage(url, fallbackOutputFormat) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Generated image could not be downloaded.");
  }
  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || mimeTypeForOutputFormat(fallbackOutputFormat);
  const outputFormat = outputFormatFromMimeType(mimeType, fallbackOutputFormat);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: mimeTypeForOutputFormat(outputFormat),
    outputFormat
  };
}

async function requestOpenAIGeneratedImage({ settings, prompt, size, quality, outputFormat }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await fetch(`${settings.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildOpenAIImagePayload({
      model: settings.model,
      prompt,
      size,
      quality,
      outputFormat
    }))
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || "Image generation failed.");
  }

  const image = data.data?.[0];
  if (image?.b64_json) {
    return {
      buffer: Buffer.from(image.b64_json, "base64"),
      mimeType: mimeTypeForOutputFormat(outputFormat),
      outputFormat
    };
  }
  if (image?.url) {
    return fetchGeneratedImage(image.url, outputFormat);
  }
  throw new Error("Image generation did not return an image.");
}

async function requestSiliconFlowGeneratedImage({ settings, prompt, size, quality, outputFormat }) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  const response = await fetch(`${settings.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildSiliconFlowImagePayload({
      model: settings.model,
      prompt,
      size,
      quality
    }))
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || data.message || "Image generation failed.");
  }

  const image = data.data?.[0] || data.images?.[0];
  const base64 = image?.b64_json || image?.base64 || image?.image_base64;
  const url = image?.url || image?.image_url;
  if (base64) {
    return {
      buffer: Buffer.from(base64, "base64"),
      mimeType: mimeTypeForOutputFormat(outputFormat),
      outputFormat
    };
  }
  if (url) {
    return fetchGeneratedImage(url, outputFormat);
  }
  throw new Error("Image generation did not return an image.");
}

async function requestGeneratedImage({ prompt, size, quality, outputFormat }) {
  const settings = getImageGenerationSettings();

  if (!settings.configured) {
    const error = new Error("Image generation is not configured.");
    error.code = "generationUnavailable";
    throw error;
  }

  const result = settings.providerKey === AI_PROVIDER_KEYS.siliconflow
    ? await requestSiliconFlowGeneratedImage({ settings, prompt, size, quality, outputFormat })
    : await requestOpenAIGeneratedImage({ settings, prompt, size, quality, outputFormat });

  return {
    ...result,
    provider: settings.provider,
    providerKey: settings.providerKey,
    model: settings.model
  };
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
    const targetWidth = normalizeTargetDimension(body.targetWidth || body.width);
    const targetHeight = normalizeTargetDimension(body.targetHeight || body.height);
    const defaultSize = normalizeImageSize(process.env.OPENAI_IMAGE_DEFAULT_SIZE, "1024x1024");
    const size = targetWidth && targetHeight
      ? closestImageSizeForSpec({ targetWidth, targetHeight, size: body.size }, defaultSize)
      : normalizeImageSize(body.size, defaultSize);
    const sizeSource = normalizeSizeSource(body.sizeSource, targetWidth && targetHeight ? (promptContext?.sizeSource || "customTarget") : "serviceDefault");
    const quality = normalizeImageQuality(body.quality, normalizeImageQuality(process.env.OPENAI_IMAGE_DEFAULT_QUALITY, "auto"));
    const outputFormat = normalizeImageOutputFormat(body.outputFormat, normalizeImageOutputFormat(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "webp"));
    const directoryPath = normalizeAssetDirectory(body.directoryPath || "generated") || "generated";
    const tags = normalizeAssetTags(body.tags?.length ? body.tags : ["generated"]);

    if (!prompt) {
      return NextResponse.json({ error: "Image prompt is required." }, { status: 400 });
    }

    const generated = await requestGeneratedImage({ prompt, size, quality, outputFormat });
    const buffer = generated.buffer;
    if (!buffer.length || buffer.length > MAX_PROJECT_ASSET_SIZE) {
      return NextResponse.json({ error: "Generated image is larger than 5 MB. Try a lower quality setting." }, { status: 400 });
    }

    const storedOutputFormat = normalizeImageOutputFormat(generated.outputFormat, outputFormat);
    const extension = storedOutputFormat === "jpeg" ? "jpg" : storedOutputFormat;
    const storagePath = createProjectAssetStoragePath(directoryPath, `generated.${extension}`);
    const mimeType = generated.mimeType || mimeTypeForOutputFormat(storedOutputFormat);
    const [assetWidth, assetHeight] = size.split("x").map(Number);
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

    await createProjectAssetFolder(user, { directoryPath });
    await Promise.all(tags.map((name) => createProjectAssetTag(user, { name })));

    const asset = await createProjectAssetRecord(user, {
      storagePath,
      originalFilename: `generated-${Date.now()}.${extension}`,
      displayName: prompt.slice(0, 80),
      directoryPath,
      mimeType,
      fileSize: buffer.length,
      source: "generated",
      altText: prompt.slice(0, 300),
      tags,
      width: assetWidth,
      height: assetHeight,
      metadata: {
        prompt,
        promptMode,
        promptSupplement,
        promptContext,
        targetWidth,
        targetHeight,
        targetSize: targetWidth && targetHeight ? `${targetWidth}x${targetHeight}` : "",
        sizeSource,
        size,
        quality,
        outputFormat: storedOutputFormat,
        requestedOutputFormat: outputFormat,
        provider: generated.provider,
        providerKey: generated.providerKey,
        model: generated.model
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
        targetWidth,
        targetHeight,
        sizeSource,
        promptMode,
        provider: generated.providerKey,
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
