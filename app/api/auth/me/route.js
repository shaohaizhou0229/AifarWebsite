import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countUnreadNotifications } from "@/lib/notifications";
import { ensureProfile, getProfile, isProfileActive } from "@/lib/profiles";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ user: null, profile: null, unreadCount: 0 });
  }

  let profile = await getProfile(user.id);
  if (!profile) {
    profile = await ensureProfile(user);
  }

  let unreadCount = 0;
  if (isProfileActive(profile)) {
    unreadCount = await countUnreadNotifications(user.id).catch(() => 0);
  }

  return NextResponse.json({ user, profile, unreadCount });
}
