import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureProfile, getProfile } from "@/lib/profiles";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ user: null, profile: null });
  }

  let profile = await getProfile(user.id);
  if (!profile) {
    profile = await ensureProfile(user);
  }

  return NextResponse.json({ user, profile });
}
