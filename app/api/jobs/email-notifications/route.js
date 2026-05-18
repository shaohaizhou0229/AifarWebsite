import { NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return token === secret;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Number.isFinite(Number(body.limit)) ? Math.min(Math.max(Number(body.limit), 1), 50) : 10;
  const processed = await processEmailQueue({ limit });

  return NextResponse.json({ processed });
}
