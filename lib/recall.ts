const RECALL_API_BASE = process.env.RECALL_API_BASE ?? "https://us-west-2.recall.ai/api/v1";

function authHeaders() {
  return {
    Authorization: `Token ${process.env.RECALL_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface CreateBotInput {
  meetingUrl: string;
  botName?: string;
}

export interface RecallBot {
  id: string;
}

/** Bot joins the call directly as a participant, no host permission or Zoom/Meet OAuth needed. */
export async function createRecallBot(input: CreateBotInput): Promise<RecallBot> {
  const res = await fetch(`${RECALL_API_BASE}/bot/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      meeting_url: input.meetingUrl,
      bot_name: input.botName ?? "Agentic OS Notetaker",
    }),
  });
  if (!res.ok) throw new Error(`Recall create-bot failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export interface RecallTranscript {
  text: string;
}

/** Reads the bot's caption-based transcript once the call has ended. */
export async function getRecallTranscript(botId: string): Promise<RecallTranscript | null> {
  const res = await fetch(`${RECALL_API_BASE}/bot/${botId}/transcript/`, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Recall get-transcript failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Recording audio URL, used for the Whisper fallback when captions were off. */
export async function getRecallRecordingUrl(botId: string): Promise<string | null> {
  const res = await fetch(`${RECALL_API_BASE}/bot/${botId}/`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Recall get-bot failed: ${res.status} ${await res.text()}`);
  const bot = await res.json();
  return bot.video_url ?? bot.media_shortcuts?.recording?.data?.download_url ?? null;
}
