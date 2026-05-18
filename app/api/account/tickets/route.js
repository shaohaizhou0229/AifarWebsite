import { NextResponse } from "next/server";
import { AuthRequiredError, requireUser } from "@/lib/auth";
import { ensureProfile, isProfileActive } from "@/lib/profiles";
import { listUserTickets } from "@/lib/tickets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await ensureProfile(user);
    if (!isProfileActive(profile)) {
      return NextResponse.json({ error: "This account is not active." }, { status: 403 });
    }
    const tickets = await listUserTickets(user);
    return NextResponse.json({ tickets });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to load tickets." }, { status: 500 });
  }
}
