import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listDocumentCategories, listPublicDocuments } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const [categories, documents] = await Promise.all([
      listDocumentCategories(),
      listPublicDocuments({ includeLoginGated: Boolean(user?.id) })
    ]);

    return NextResponse.json({ categories, documents, isLoggedIn: Boolean(user?.id) });
  } catch {
    return NextResponse.json({ error: "Unable to load documents." }, { status: 500 });
  }
}
