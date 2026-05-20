import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { restoreClientReleaseVersion, sanitizePlatform } from "@/lib/downloads";
import { getProfile } from "@/lib/profiles";
import { localizedPath, locales } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function revalidatePublicDownloadsPages() {
  locales.forEach((locale) => {
    revalidatePath(localizedPath(locale, "/downloads/"));
  });
}

export async function POST(_request, { params }) {
  const { platform, id } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.downloads);
    const release = await restoreClientReleaseVersion(platformKey, id, user);
    if (!release) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }
    revalidatePublicDownloadsPages();
    return NextResponse.json({ release });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Could not restore release version." }, { status: 400 });
  }
}
