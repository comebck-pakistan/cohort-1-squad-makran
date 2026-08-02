import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceClient } from "@/lib/supabase/service";
import { inngest } from "@/inngest/client";

/**
 * Recall.ai signs webhooks via Svix. Verify first, then fast-ack: only cheap DB status updates
 * and an Inngest event happen here, the actual transcription/ticketization work happens in
 * inngest/functions/ticketize.ts so a slow LLM call never holds up the webhook response.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: { event: string; data: { bot: { id: string }; status?: { code: string } } };
  try {
    const wh = new Webhook(process.env.RECALL_WEBHOOK_SECRET!);
    event = wh.verify(payload, headers) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.event !== "bot.status_change") {
    return NextResponse.json({ ok: true });
  }

  const botId = event.data.bot.id;
  const statusCode = event.data.status?.code;
  const supabase = createServiceClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("recall_bot_id", botId)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ ok: true });
  }

  if (statusCode === "in_call_recording") {
    await supabase.from("meetings").update({ status: "in_progress" }).eq("id", meeting.id);
  } else if (statusCode === "call_ended" || statusCode === "done") {
    await supabase.from("meetings").update({ status: "processing" }).eq("id", meeting.id);
    await inngest.send({ name: "meeting/ready-for-processing", data: { meetingId: meeting.id } });
  } else if (statusCode === "fatal_error") {
    await supabase.from("meetings").update({ status: "failed" }).eq("id", meeting.id);
  }

  return NextResponse.json({ ok: true });
}
