import { getPostgresPool } from "@/lib/db";
import { getSectionTemplateRecognitionSettingsAsync } from "@/lib/image-generation-settings";
import recognitionRules from "@/lib/section-template-recognition.cjs";

const {
  RECOGNITION_UNAVAILABLE_CODE,
  buildOpenAIRecognitionPayload,
  buildSiliconFlowDirectRecognitionPayload,
  buildSiliconFlowTemplatePayload,
  buildSiliconFlowVisionPayload,
  createDataUrl,
  createUatRecognitionOutput,
  extractChatCompletionText,
  extractResponseJson,
  getImageDimensionsFromDataUrl,
  normalizeRecognitionCandidate,
  normalizeRecognitionRequestFields,
  validateScreenshotFileInput
} = recognitionRules;

const TASK_STATUSES = new Set(["queued", "running", "succeeded", "failed", "cancelled", "expired"]);
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled", "expired"]);
const TASK_AI_TIMEOUT_MS = 300000;

function clean(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

function normalizeTaskStatus(value) {
  const status = clean(value, 40);
  return TASK_STATUSES.has(status) ? status : "";
}

function mapRecognitionTask(row, options = {}) {
  if (!row) return null;
  const task = {
    id: row.id,
    pageKey: row.page_key || "",
    locale: row.locale || "en",
    industry: row.industry || "custom",
    sectionTypeHint: row.section_type_hint || "auto",
    purposeHint: row.purpose_hint || "",
    status: row.status || "queued",
    progress: Number(row.progress || 0),
    screenshot: {
      filename: row.screenshot_filename || "",
      mimeType: row.screenshot_mime_type || "",
      size: Number(row.screenshot_size || 0)
    },
    candidate: row.candidate || null,
    recognition: row.recognition || null,
    errorCode: row.error_code || "",
    errorMessage: row.error_message || "",
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };

  if (options.includeScreenshotDataUrl) {
    task.screenshotDataUrl = row.screenshot_data_url || "";
  }

  return task;
}

function sourceImageFromTask(task) {
  const dimensions = getImageDimensionsFromDataUrl(task?.screenshotDataUrl || "");
  return {
    filename: task?.screenshot?.filename || "",
    mimeType: task?.screenshot?.mimeType || "",
    size: Number(task?.screenshot?.size || 0),
    ...dimensions
  };
}

function fieldsFromTask(task) {
  return normalizeRecognitionRequestFields({
    locale: task.locale,
    pageKey: task.pageKey,
    industry: task.industry,
    sectionTypeHint: task.sectionTypeHint,
    purposeHint: task.purposeHint
  });
}

function isMissingTaskTableError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return error?.code === "42P01" || message.includes("site_section_recognition_tasks");
}

export function isSectionRecognitionTaskMissingTableError(error) {
  return isMissingTaskTableError(error);
}

export async function createSectionRecognitionTask(adminUser, input = {}) {
  const screenshot = input.screenshot;
  const screenshotValidation = validateScreenshotFileInput(screenshot);
  if (!screenshotValidation.ok) {
    const error = new Error(screenshotValidation.message);
    error.code = screenshotValidation.code;
    throw error;
  }

  const fields = normalizeRecognitionRequestFields(input);
  const buffer = Buffer.from(await screenshot.arrayBuffer());
  const dataUrl = createDataUrl(buffer, screenshot.type);
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.site_section_recognition_tasks (
      page_key,
      locale,
      industry,
      section_type_hint,
      purpose_hint,
      status,
      progress,
      screenshot_filename,
      screenshot_mime_type,
      screenshot_size,
      screenshot_data_url,
      created_by,
      updated_by
    )
    values ($1, $2, $3, $4, $5, 'queued', 5, $6, $7, $8, $9, $10, $10)
    returning *`,
    [
      fields.pageKey || null,
      fields.locale,
      fields.industry,
      fields.sectionTypeHint,
      fields.purposeHint,
      clean(screenshot.name, 180),
      clean(screenshot.type, 80),
      Number(screenshot.size || buffer.length || 0),
      dataUrl,
      adminUser?.id || null
    ]
  );
  return mapRecognitionTask(result.rows[0]);
}

export async function listSectionRecognitionTasks(adminUser, filters = {}) {
  const fields = normalizeRecognitionRequestFields(filters);
  const params = [adminUser?.id || null, fields.locale];
  const conditions = ["created_by = $1", "locale = $2", "expires_at > now()"];

  if (fields.pageKey) {
    params.push(fields.pageKey);
    conditions.push(`(page_key is null or page_key = $${params.length})`);
  }

  const result = await getPostgresPool().query(
    `select *
     from public.site_section_recognition_tasks
     where ${conditions.join(" and ")}
     order by updated_at desc
     limit 12`,
    params
  );
  return result.rows.map((row) => mapRecognitionTask(row));
}

export async function getSectionRecognitionTask(taskId, adminUser, options = {}) {
  const result = await getPostgresPool().query(
    `select *
     from public.site_section_recognition_tasks
     where id = $1 and created_by = $2
     limit 1`,
    [taskId, adminUser?.id || null]
  );
  return mapRecognitionTask(result.rows[0], options);
}

export async function cancelSectionRecognitionTask(taskId, adminUser) {
  const result = await getPostgresPool().query(
    `update public.site_section_recognition_tasks
     set status = 'cancelled',
         progress = 100,
         error_code = '',
         error_message = '',
         screenshot_data_url = '',
         completed_at = now(),
         updated_by = $2,
         updated_at = now()
     where id = $1
       and created_by = $2
       and status in ('queued', 'running')
     returning *`,
    [taskId, adminUser?.id || null]
  );
  return mapRecognitionTask(result.rows[0]);
}

async function markTaskRunning(taskId) {
  const result = await getPostgresPool().query(
    `update public.site_section_recognition_tasks
     set status = 'running',
         progress = 20,
         started_at = coalesce(started_at, now()),
         updated_at = now()
     where id = $1 and status = 'queued'
     returning *`,
    [taskId]
  );
  return mapRecognitionTask(result.rows[0], { includeScreenshotDataUrl: true });
}

async function completeTask(taskId, output) {
  const result = await getPostgresPool().query(
    `update public.site_section_recognition_tasks
     set status = 'succeeded',
         progress = 100,
         candidate = $2::jsonb,
         recognition = $3::jsonb,
         error_code = '',
         error_message = '',
         screenshot_data_url = '',
         completed_at = now(),
         updated_at = now()
     where id = $1 and status = 'running'
     returning *`,
    [taskId, JSON.stringify(output.candidate || null), JSON.stringify(output.recognition || null)]
  );
  return mapRecognitionTask(result.rows[0]);
}

async function failTask(taskId, error) {
  const code = clean(error?.code || "recognition_failed", 80);
  const message = clean(error?.message || "Section template recognition failed.", 500);
  const result = await getPostgresPool().query(
    `update public.site_section_recognition_tasks
     set status = 'failed',
         progress = 100,
         error_code = $2,
         error_message = $3,
         completed_at = now(),
         updated_at = now()
     where id = $1 and status in ('queued', 'running')
     returning *`,
    [taskId, code, message]
  );
  return mapRecognitionTask(result.rows[0]);
}

export async function retrySectionRecognitionTask(taskId, adminUser) {
  const result = await getPostgresPool().query(
    `update public.site_section_recognition_tasks
     set status = 'queued',
         progress = 5,
         candidate = null,
         recognition = null,
         error_code = '',
         error_message = '',
         started_at = null,
         completed_at = null,
         updated_by = $2,
         updated_at = now()
     where id = $1
       and created_by = $2
       and status = 'failed'
       and screenshot_data_url <> ''
       and expires_at > now()
     returning *`,
    [taskId, adminUser?.id || null]
  );
  return mapRecognitionTask(result.rows[0]);
}

async function fetchRecognitionJson({ url, apiKey, body, signal }) {
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message || data.message || "Section template recognition failed.");
    error.code = "recognition_failed";
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }

  return data;
}

async function requestRecognizedSection({ task, fields, settings, signal }) {
  if (settings.providerKey === "siliconflow") {
    const visionModel = settings.visionModel || settings.modelIds?.[0] || settings.model;
    if (settings.textModel) {
      const visionResponse = await fetchRecognitionJson({
        url: `${settings.baseUrl}/chat/completions`,
        apiKey: settings.apiKey,
        signal,
        body: buildSiliconFlowVisionPayload({
          model: visionModel,
          dataUrl: task.screenshotDataUrl,
          fields
        })
      });
      const visionSummary = extractChatCompletionText(visionResponse) || JSON.stringify(visionResponse).slice(0, 6000);
      return fetchRecognitionJson({
        url: `${settings.baseUrl}/chat/completions`,
        apiKey: settings.apiKey,
        signal,
        body: buildSiliconFlowTemplatePayload({
          model: settings.textModel,
          visionSummary,
          fields
        })
      });
    }

    return fetchRecognitionJson({
      url: `${settings.baseUrl}/chat/completions`,
      apiKey: settings.apiKey,
      signal,
      body: buildSiliconFlowDirectRecognitionPayload({
        model: visionModel,
        dataUrl: task.screenshotDataUrl,
        fields
      })
    });
  }

  return fetchRecognitionJson({
    url: `${settings.baseUrl}/responses`,
    apiKey: settings.apiKey,
    signal,
    body: buildOpenAIRecognitionPayload({
      model: settings.model,
      dataUrl: task.screenshotDataUrl,
      fields
    })
  });
}

export async function processSectionRecognitionTask(taskId) {
  const task = await markTaskRunning(taskId);
  if (!task || TERMINAL_STATUSES.has(task.status) || !task.screenshotDataUrl) return null;

  try {
    const sourceImage = sourceImageFromTask(task);
    const fields = {
      ...fieldsFromTask(task),
      sourceImage
    };
    const settings = await getSectionTemplateRecognitionSettingsAsync({ includeSecret: true });
    if (settings.uatModeEnabled) {
      return completeTask(task.id, createUatRecognitionOutput(fields, sourceImage));
    }

    if (!settings.configured) {
      const error = new Error("AI section recognition is not configured.");
      error.code = RECOGNITION_UNAVAILABLE_CODE;
      throw error;
    }

    const controller = new AbortController();
    const timeoutMs = Math.min(Number(settings.timeoutMs || TASK_AI_TIMEOUT_MS), TASK_AI_TIMEOUT_MS);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const responseJson = await requestRecognizedSection({
        task,
        fields,
        settings,
        signal: controller.signal
      });
      const result = extractResponseJson(responseJson);
      const output = normalizeRecognitionCandidate(result, fields, sourceImage);
      return completeTask(task.id, output);
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("AI section recognition task timed out.");
        timeoutError.code = "recognition_timeout";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return failTask(task.id, error);
  }
}
