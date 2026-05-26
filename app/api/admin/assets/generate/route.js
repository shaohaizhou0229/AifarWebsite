import { NextResponse } from "next/server";
import {
  AdminRequiredError,
  AuthRequiredError,
  createUserSupabaseClient,
  getCurrentAccessToken,
  requireAdmin
} from "@/lib/auth";
import {
  MAX_PROJECT_ASSET_SIZE,
  PROJECT_ASSET_BUCKET,
  createProjectAssetRecord,
  createProjectAssetStoragePath
} from "@/lib/project-assets";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024"]);
const IMAGE_QUALITIES = new Set(["low", "medium", "high", "auto"]);
const OUTPUT_FORMATS = new Set(["png", "jpeg", "webp"]);

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

function normalizeOutputFormat(value) {
  const format = String(value || process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "webp").trim().toLowerCase();
  return OUTPUT_FORMATS.has(format) ? format : "webp";
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
  const model = String(process.env.OPENAI_IMAGE_MODEL || "").trim();

  if (!apiKey || !model) {
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
    const [{ user }, accessToken] = await Promise.all([requireAdmin(getProfile), getCurrentAccessToken()]);
    if (!accessToken) {
      return NextResponse.json({ error: "A valid admin session is required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const prompt = normalizePrompt(body.prompt);
    const size = IMAGE_SIZES.has(String(body.size || "")) ? String(body.size) : "1024x1024";
    const quality = IMAGE_QUALITIES.has(String(body.quality || "")) ? String(body.quality) : "auto";
    const outputFormat = normalizeOutputFormat(body.outputFormat);

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
      metadata: { size, quality, outputFormat }
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
