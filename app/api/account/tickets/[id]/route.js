import { NextResponse } from "next/server";
import { AuthRequiredError, requireUser } from "@/lib/auth";
import { getUserTicket } from "@/lib/tickets";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const user = await requireUser();
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
