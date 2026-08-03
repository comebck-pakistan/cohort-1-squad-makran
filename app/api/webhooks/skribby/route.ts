import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { inngest } from "@/inngest/client";

const TIMESTAMP_TOLERANCE_SECONDS = 300;

const TERMINAL_FAILURE_STATUSES = new Set([
  "not_admitted",
  "auth_required",
  "invalid_credentials",
  "invalid_api_key",
  "failed",
]);

function verifySignature(rawBody: string, timestamp: string, signature: string): boolean {
  const secret = process.env.SKRIBBY_WEBHOOK_SECRET!;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

interface SkribbyStatusUpdateEvent {
  bot_id: string;
  type: string;
  data: { old_status: string; new_status: string; stop_reason?: string };
}

/**
 * Skribby signs webhooks with HMAC-SHA256 (X-Skribby-Signature / X-Skribby-Timestamp). Verify
 * first, then fast-ack: only cheap DB status updates and an Inngest event happen here, the
 * actual transcription/ticketization work happens in inngest/functions/ticketize.ts so a slow
 * LLM call never holds up the webhook response.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-skribby-signature") ?? "";
  const timestamp = request.headers.get("x-skribby-timestamp") ?? "";

  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > TIMESTAMP_TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "Timestamp missing or too old" }, { status: 400 });
  }
  if (!signature || !verifySignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as SkribbyStatusUpdateEvent;

  if (event.type !== "status_update") {
    return NextResponse.json({ ok: true });
  }

  const botId = event.bot_id;
  const newStatus = event.data.new_status;
  const supabase = createServiceClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("skribby_bot_id", botId)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ ok: true });
  }

  if (newStatus === "recording") {
    await supabase.from("meetings").update({ status: "in_progress" }).eq("id", meeting.id);
  } else if (newStatus === "finished") {
    await supabase.from("meetings").update({ status: "processing" }).eq("id", meeting.id);
    await inngest.send({ name: "meeting/ready-for-processing", data: { meetingId: meeting.id } });
  } else if (TERMINAL_FAILURE_STATUSES.has(newStatus)) {
    await supabase.from("meetings").update({ status: "failed" }).eq("id", meeting.id);
  }

  return NextResponse.json({ ok: true });
}
