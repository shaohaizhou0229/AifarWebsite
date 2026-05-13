import { NextResponse } from "next/server";
import { AuthRequiredError, requireUser } from "@/lib/auth";
import { listUserTickets } from "@/lib/tickets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const tickets = await listUserTickets(user);
    return NextResponse.json({ tickets });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to load tickets." }, { status: 500 });
  }
}
