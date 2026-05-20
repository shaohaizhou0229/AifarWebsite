import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const {
      getReferrerHost,
      getUserAgentFamily,
      recordSiteAnalyticsEvent
    } = await import("@/lib/site-analytics");
    const body = await request.json();
    await recordSiteAnalyticsEvent({
      path: body.path,
      locale: body.locale,
      eventType: body.eventType,
      referrerHost: getReferrerHost(request.headers.get("referer") || ""),
      userAgentFamily: getUserAgentFamily(request.headers.get("user-agent") || "")
    });
  } catch {
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
