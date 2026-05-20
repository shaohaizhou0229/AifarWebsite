import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, getCurrentAccessToken, requireAdminPermission } from "@/lib/auth";
import { adminJson } from "@/lib/admin-response";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import {
  MAX_MARKDOWN_FILE_SIZE,
  isAllowedMarkdownFilename,
  listAdminDocuments,
  saveDocumentVersion,
  uploadMarkdownToStorage
} from "@/lib/documents";

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

function normalizeInput(body) {
  return {
    id: body.id || "",
    title: String(body.title || "").trim(),
    slug: String(body.slug || "").trim(),
    summary: String(body.summary || "").trim(),
    categoryKey: String(body.categoryKey || "").trim(),
    versionLabel: String(body.versionLabel || "").trim(),
    markdownContent: String(body.markdownContent || ""),
    originalFilename: String(body.originalFilename || "document.md").trim(),
    isPublished: Boolean(body.isPublished)
  };
}

export async function GET() {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.docs);
    const documents = await listAdminDocuments();
    return adminJson({ documents });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not list documents." }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const [{ user }, accessToken] = await Promise.all([requireAdminPermission(getProfile, ADMIN_PERMISSIONS.docs), getCurrentAccessToken()]);
    const input = normalizeInput(await request.json().catch(() => ({})));

    if (!input.originalFilename || !isAllowedMarkdownFilename(input.originalFilename)) {
      return NextResponse.json({ error: "Only .md files are supported." }, { status: 400 });
    }

    const fileSize = Buffer.byteLength(input.markdownContent, "utf8");
    if (!fileSize || fileSize > MAX_MARKDOWN_FILE_SIZE) {
      return NextResponse.json({ error: "Markdown file size must be between 1 byte and 5 MB." }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json({ error: "A valid admin session is required." }, { status: 401 });
    }

    const uploadInfo = await uploadMarkdownToStorage(
      accessToken,
      input.slug || input.title,
      input.versionLabel,
      input.markdownContent,
      input.originalFilename
    );
    const result = await saveDocumentVersion(user, input, uploadInfo);
    return NextResponse.json(result);
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not save document." }, { status: 400 });
  }
}
