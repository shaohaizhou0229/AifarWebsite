import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const REQUEST_TYPES = new Set([
  "product_inquiry",
  "technical_support",
  "partnership",
  "other"
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload) {
  const name = normalizeText(payload?.name);
  const workEmail = normalizeText(payload?.workEmail).toLowerCase();
  const organization = normalizeText(payload?.organization);
  const subject = normalizeText(payload?.subject);
  const requestType = normalizeText(payload?.requestType);
  const message = normalizeText(payload?.message);

  if (!name || !workEmail || !requestType || !message) {
    return { error: "Please fill in all required fields." };
  }

  if (!EMAIL_PATTERN.test(workEmail)) {
    return { error: "Please enter a valid work email." };
  }

  if (!REQUEST_TYPES.has(requestType)) {
    return { error: "Please choose a valid request type." };
  }

  return {
    data: {
      name,
      workEmail,
      organization: organization || null,
      subject: subject || null,
      requestType,
      message
    }
  };
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const validation = validatePayload(payload);

  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const user = await getCurrentUser();
  const { name, organization, subject, requestType, message } = validation.data;
  const workEmail = user?.email ? user.email.toLowerCase() : validation.data.workEmail;

  try {
    const pool = getPostgresPool();

    await pool.query(
      `insert into public.contact_requests
        (user_id, name, work_email, organization, subject, request_type, message)
       values
        ($1, $2, $3, $4, $5, $6, $7)`,
      [user?.id || null, name, workEmail, organization, subject, requestType, message]
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to create contact request", error);

    return NextResponse.json(
      { error: "We could not submit your request right now. Please try again later." },
      { status: 500 }
    );
  }
}
