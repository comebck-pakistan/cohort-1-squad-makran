import { NonRetriableError } from "inngest";
import { inngest, type MeetingReadyForProcessing } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { ticketizeTranscript } from "@/lib/llm/ticketize";
import { transcribeAudio } from "@/lib/llm/whisper";
import { getSkribbyTranscript, getSkribbyRecordingUrl } from "@/lib/skribby";

export const ticketizeMeeting = inngest.createFunction(
  {
    id: "ticketize-meeting",
    triggers: [{ event: "meeting/ready-for-processing" }],
    // Any unhandled crash here (Whisper failure, ticketization LLM failure, a DB write throwing)
    // otherwise leaves the meeting stuck at "processing" forever with no visibility.
    onFailure: async ({ event, error, step }) => {
      const original = event.data.event.data as MeetingReadyForProcessing;
      const supabase = createServiceClient();
      const reason = (error.message ?? "An unexpected error stopped processing.").slice(0, 500);
      await step.run("mark-meeting-failed-on-crash", async () => {
        const { error: updateError } = await supabase
          .from("meetings")
          .update({ status: "failed", failure_reason: reason })
          .eq("id", original.meetingId);
        if (updateError) throw updateError;
      });
    },
  },
  async ({ event, step }) => {
    const { meetingId, transcript: providedTranscript } = event.data as MeetingReadyForProcessing;
    const supabase = createServiceClient();

    const meeting = await step.run("load-meeting", async () => {
      const { data, error } = await supabase.from("meetings").select("*").eq("id", meetingId).single();
      if (error) throw error;
      return data;
    });

    let transcript = providedTranscript ?? null;
    let transcriptSource: "caption" | "whisper_fallback" | "manual" = providedTranscript ? "manual" : "caption";

    if (!transcript && meeting.skribby_bot_id) {
      const botId = meeting.skribby_bot_id;
      const captionResult = await step.run("fetch-caption-transcript", () => getSkribbyTranscript(botId));
      if (captionResult?.text) {
        transcript = captionResult.text;
      }
    }

    // Real failure mode: transcription model produced nothing (silence, invalid_api_key, etc).
    // Bot still has the recorded audio, so we re-route through Whisper instead of surfacing a
    // dead end (docs/features.md graceful degradation).
    if (!transcript && meeting.skribby_bot_id) {
      const botId = meeting.skribby_bot_id;
      transcript = await step.run("transcribe-fallback", async () => {
        const recordingUrl = await getSkribbyRecordingUrl(botId);
        if (!recordingUrl) throw new NonRetriableError("No recording available for Whisper fallback.");
        return transcribeAudio(new URL(recordingUrl));
      });
      transcriptSource = "whisper_fallback";
    }

    if (!transcript) {
      const reason = "No transcript was available. The recording may have failed or produced no audio.";
      await step.run("mark-failed", async () => {
        await supabase.from("meetings").update({ status: "failed", failure_reason: reason }).eq("id", meetingId);
      });
      return { status: "failed" as const, reason };
    }

    const finalTranscript = transcript;
    const tickets = await step.run("ticketize", () => ticketizeTranscript(finalTranscript));

    await step.run("save-draft-tickets", async () => {
      await supabase
        .from("meetings")
        .update({
          draft_tickets: tickets,
          transcript_source: transcriptSource,
          transcript_text: finalTranscript,
          status: "ready",
        })
        .eq("id", meetingId);
    });

    return { status: "ready" as const, ticketCount: tickets.length };
  }
);
