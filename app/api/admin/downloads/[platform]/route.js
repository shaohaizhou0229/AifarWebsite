import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { clientReleaseFileExists, getAdminDownloadPlatform, sanitizePlatform, updateClientRelease } from "@/lib/downloads";
import { EMAIL_EVENTS, enqueueManyAndTrySend, getAdminNotificationEmails, getSiteUrl } from "@/lib/email";
import { buildDownloadPublishedEmail } from "@/lib/email/templates";
import { createNotificationsForPermission, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { localizedPath, locales } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value) {
  const text = normalizeText(value);
  if (!text) return "";

  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

async function queueDownloadPublishedEmails(platformKey, release) {
  const recipients = getAdminNotificationEmails();
  if (!recipients.length) return false;

  try {
    const email = buildDownloadPublishedEmail({
      platform: platformKey,
      release,
      adminUrl: new URL(`/zh-CN/admin/downloads/${platformKey}/`, getSiteUrl()).toString()
    });

    await enqueueManyAndTrySend(recipients.map((recipient) => ({
      eventType: EMAIL_EVENTS.downloadPublished,
      to: recipient,
      subject: email.subject,
      text: email.text,
      html: email.html,
      relatedType: "client_release",
      metadata: { platform: platformKey, version: release.version }
    })));

    return true;
  } catch (error) {
    console.error("Failed to queue download published email", error);
    return false;
  }
}

function revalidatePublicDownloadsPages() {
  locales.forEach((locale) => {
    revalidatePath(localizedPath(locale, "/downloads/"));
  });
}

export async function PATCH(request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.downloads);
    const body = await request.json();
    const externalUrl = normalizeUrl(body.externalUrl);
    const isPublished = Boolean(body.isPublished);
    const before = await getAdminDownloadPlatform(platformKey);

    if (isPublished && !externalUrl) {
      const release = before?.release;

      if (!release?.storagePath || !release.checksumSha256) {
        return NextResponse.json({ error: "A completed release file is required before publishing." }, { status: 400 });
      }

      const fileExists = await clientReleaseFileExists(release.storagePath);
      if (!fileExists) {
        return NextResponse.json({ error: "The release file is missing from storage. Delete it and upload again." }, { status: 400 });
      }
    }

    const release = await updateClientRelease(platformKey, user, {
      version: normalizeText(body.version),
      buildNumber: normalizeText(body.buildNumber),
      releaseNotes: normalizeText(body.releaseNotes),
      externalUrl,
      isPublished
    });
    revalidatePublicDownloadsPages();

    const emailQueued = isPublished && !before?.release?.isPublished
      ? await queueDownloadPublishedEmails(platformKey, release)
      : false;
    if (isPublished && !before?.release?.isPublished) {
      await createNotificationsForPermission(ADMIN_PERMISSIONS.downloads, {
        eventType: NOTIFICATION_EVENTS.downloadPublished,
        title: "客户端版本已发布",
        body: `${platformKey} 客户端 ${release.version || ""} 已发布。`,
        relatedType: "client_release",
        relatedId: release.id || null,
        metadata: { platform: platformKey, version: release.version },
        url: `/zh-CN/admin/downloads/${platformKey}/`,
        sendEmail: false
      });
    }

    return NextResponse.json({ release, emailQueued });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not update release." }, { status: 400 });
  }
}
