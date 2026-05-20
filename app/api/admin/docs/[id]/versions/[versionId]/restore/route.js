import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { restoreDocumentVersion } from "@/lib/documents";
import { getProfile } from "@/lib/profiles";
import { localizedPath, locales } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function revalidatePublicDocumentPages(document) {
  locales.forEach((locale) => {
    revalidatePath(localizedPath(locale, "/docs/"));
    if (document?.slug) {
      revalidatePath(localizedPath(locale, `/docs/${document.slug}/`));
    }
  });
}

export async function POST(_request, { params }) {
  const { id, versionId } = await params;

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.docs);
    const result = await restoreDocumentVersion(id, versionId, user);
    if (!result?.document) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }
    revalidatePublicDocumentPages(result.document);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Could not restore document version." }, { status: 400 });
  }
}
