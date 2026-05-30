import { after, NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getProfile } from "@/lib/profiles";
import {
  createSectionRecognitionTask,
  isSectionRecognitionTaskMissingTableError,
  listSectionRecognitionTasks,
  processSectionRecognitionTask
} from "@/lib/section-recognition-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

function tableMissingResponse() {
  return NextResponse.json(
    {
      error: "Section recognition task storage is not ready.",
      code: "recognitionTaskStorageMissing"
    },
    { status: 503 }
  );
}

export async function GET(request) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const { searchParams } = new URL(request.url);
    const tasks = await listSectionRecognitionTasks(user, {
      locale: searchParams.get("locale") || "en",
      pageKey: searchParams.get("page") || ""
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    if (isSectionRecognitionTaskMissingTableError(error)) return tableMissingResponse();
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not list recognition tasks." }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const formData = await request.formData();
    const task = await createSectionRecognitionTask(user, {
      screenshot: formData.get("screenshot"),
      locale: formData.get("locale"),
      pageKey: formData.get("pageKey"),
      industry: formData.get("industry"),
      sectionTypeHint: formData.get("sectionTypeHint"),
      purposeHint: formData.get("purposeHint")
    });

    after(async () => {
      await processSectionRecognitionTask(task.id).catch((error) => {
        console.error("[section-recognition-task] failed", error);
      });
    });

    return NextResponse.json({ task }, { status: 202 });
  } catch (error) {
    if (isSectionRecognitionTaskMissingTableError(error)) return tableMissingResponse();
    return permissionError(error) || NextResponse.json(
      { error: error.message || "Could not create recognition task.", code: error.code || "recognitionTaskFailed" },
      { status: 400 }
    );
  }
}
