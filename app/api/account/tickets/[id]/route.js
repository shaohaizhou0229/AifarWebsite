import { NextResponse } from "next/server";
import { AuthRequiredError, requireUser } from "@/lib/auth";
import { ensureProfile, isProfileActive } from "@/lib/profiles";
import { getUserTicket } from "@/lib/tickets";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const user = await requireUser();
    const profile = await ensureProfile(user);
    if (!isProfileActive(profile)) {
      return NextResponse.json({ error: "This account is not active." }, { status: 403 });
    }
    const { id } = await params;
    const result = await getUserTicket(user, id);

    if (!result) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to load ticket." }, { status: 500 });
  }
}
