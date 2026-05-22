import { NextResponse } from "next/server";
import { AuthRequiredError, getCurrentAccessToken, getCurrentUser } from "@/lib/auth";
import { createDocumentDownloadUrl, getPublicDocumentBySlug, normalizeDocumentSlug } from "@/lib/documents";
import { getReferrerHost, getUserAgentFamily, recordSiteAnalyticsEvent } from "@/lib/site-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getLocaleFromReferrer(request) {
  try {
    const url = new URL(request.headers.get("referer") || "");
    const [, locale] = url.pathname.split("/");
    return locale;
  } catch {
    return "";
  }
}

async function recordDocumentDownload(request, document) {
  await recordSiteAnalyticsEvent({
    path: `/docs/${document.categoryKey || "other"}/${document.slug}/download/`,
    locale: getLocaleFromReferrer(request),
    eventType: "document_download",
    referrerHost: getReferrerHost(request.headers.get("referer") || ""),
    userAgentFamily: getUserAgentFamily(request.headers.get("user-agent") || "")
  });
}

export async function GET(request, { params }) {
  const { slug } = await params;
  const safeSlug = normalizeDocumentSlug(slug);

  if (!safeSlug) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    const [user, accessToken] = await Promise.all([getCurrentUser(), getCurrentAccessToken()]);
    const document = await getPublicDocumentBySlug(safeSlug, { includeLoginGated: Boolean(user) });

    if (!document) {
      return NextResponse.json({ error: "Document not found or sign in is required." }, { status: 404 });
    }

    if (!document.allowAuthenticatedDownload || !user) {
      throw new AuthRequiredError("Sign in is required to download this document.");
    }

    const signedUrl = await createDocumentDownloadUrl(document, accessToken);
    await recordDocumentDownload(request, document);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: error.message || "Could not download document." }, { status: 400 });
  }
}
