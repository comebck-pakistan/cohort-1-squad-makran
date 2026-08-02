import { inngest, type MeetingReadyForProcessing } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { ticketizeTranscript } from "@/lib/llm/ticketize";
import { transcribeAudio } from "@/lib/llm/whisper";
import { getRecallTranscript, getRecallRecordingUrl } from "@/lib/recall";

export const ticketizeMeeting = inngest.createFunction(
  { id: "ticketize-meeting", triggers: [{ event: "meeting/ready-for-processing" }] },
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

    if (!transcript && meeting.recall_bot_id) {
      const botId = meeting.recall_bot_id;
      const captionResult = await step.run("fetch-caption-transcript", () => getRecallTranscript(botId));
      if (captionResult?.text) {
        transcript = captionResult.text;
      }
    }

    // Real failure mode: host had live captions off. Bot still has the recorded audio, so we
    // re-route through Whisper instead of surfacing a dead end (docs/features.md graceful degradation).
    if (!transcript && meeting.recall_bot_id) {
      const botId = meeting.recall_bot_id;
      transcript = await step.run("transcribe-fallback", async () => {
        const recordingUrl = await getRecallRecordingUrl(botId);
        if (!recordingUrl) throw new Error("No recording available for Whisper fallback.");
        return transcribeAudio(new URL(recordingUrl));
      });
      transcriptSource = "whisper_fallback";
    }

    if (!transcript) {
      await step.run("mark-failed", async () => {
        await supabase.from("meetings").update({ status: "failed" }).eq("id", meetingId);
      });
      return { status: "failed" as const, reason: "No transcript available" };
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
