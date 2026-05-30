import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getProfile } from "@/lib/profiles";
import {
  getSectionRecognitionTask,
  isSectionRecognitionTaskMissingTableError
} from "@/lib/section-recognition-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

export async function GET(_request, context) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const { id } = await context.params;
    const task = await getSectionRecognitionTask(id, user);
    if (!task) {
      return NextResponse.json({ error: "Recognition task not found." }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    if (isSectionRecognitionTaskMissingTableError(error)) {
      return NextResponse.json({ error: "Section recognition task storage is not ready.", code: "recognitionTaskStorageMissing" }, { status: 503 });
    }
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not load recognition task." }, { status: 400 });
  }
}
