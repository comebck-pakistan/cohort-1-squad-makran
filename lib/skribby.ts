const SKRIBBY_API_BASE = process.env.SKRIBBY_API_BASE ?? "https://platform.skribby.io/api/v1";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.SKRIBBY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

function detectService(meetingUrl: string): "zoom" | "teams" | "gmeet" {
  if (/zoom\.us/i.test(meetingUrl)) return "zoom";
  if (/teams\.(microsoft|live)\.com/i.test(meetingUrl)) return "teams";
  return "gmeet";
}

export interface CreateBotInput {
  meetingUrl: string;
  botName?: string;
}

export interface SkribbyBot {
  id: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Bot joins the call directly as a participant, no host permission or Zoom/Meet OAuth needed. */
export async function createSkribbyBot(input: CreateBotInput): Promise<SkribbyBot> {
  const res = await fetch(`${SKRIBBY_API_BASE}/bot`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      meeting_url: input.meetingUrl,
      service: detectService(input.meetingUrl),
      bot_name: input.botName ?? "Solvo Notetaker",
      transcription_model: "groq/whisper-large-v3-turbo",
      webhook_url: `${APP_URL}/api/webhooks/skribby`,
    }),
  });
  if (!res.ok) throw new Error(`Skribby create-bot failed: ${res.status} ${await res.text()}`);
  return res.json();
}

interface SkribbyBotDetail {
  id: string;
  status: string;
  transcript: Array<{ speaker_name?: string; transcript?: string }> | null;
  recording_url: string | null;
}

async function getSkribbyBotDetail(botId: string): Promise<SkribbyBotDetail> {
  const res = await fetch(`${SKRIBBY_API_BASE}/bot/${botId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Skribby get-bot failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export interface SkribbyTranscript {
  text: string;
}

/** Joins Skribby's speaker-labeled transcript segments into flat text once the bot reaches "finished". */
export async function getSkribbyTranscript(botId: string): Promise<SkribbyTranscript | null> {
  const bot = await getSkribbyBotDetail(botId);
  const segments = (bot.transcript ?? []).filter((s) => s.transcript?.trim());
  if (segments.length === 0) return null;
  const text = segments.map((s) => `${s.speaker_name ?? "Speaker"}: ${s.transcript}`).join("\n");
  return { text };
}

/** Recording URL, used for the Whisper fallback when the transcript came back empty. */
export async function getSkribbyRecordingUrl(botId: string): Promise<string | null> {
  const bot = await getSkribbyBotDetail(botId);
  return bot.recording_url;
}
