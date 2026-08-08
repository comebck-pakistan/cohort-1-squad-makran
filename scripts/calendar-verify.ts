
/**
 * Calendar integration verification against real local Supabase.
 * Run: `npx supabase start` first, then
 *   npx tsx --env-file=.env.local scripts/calendar-verify.ts
 *
 * Real code under test: lib/google-calendar.ts + inngest/functions/calendar-sync.ts (its real
 * handler, invoked with a pass-through `step`). Only the network edge is faked: Google's token /
 * userinfo / calendar endpoints, Skribby's create-bot, and Inngest's event ingest.
 */
import { createClient } from "@supabase/supabase-js";
import { calendarSync } from "@/inngest/functions/calendar-sync";
import { getGoogleCalendarAccessToken, listUpcomingEvents } from "@/lib/google-calendar";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL_, SERVICE_KEY);

let failed = 0;
function check(label: string, ok: boolean, extra?: unknown) {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok || extra === undefined ? "" : ` -> ${JSON.stringify(extra)}`}`);
  if (!ok) failed++;
}

// ---------- fake network edge ----------
const realFetch = globalThis.fetch;
let calendarItems: unknown[] = [];
let calendarStatus = 200;
const botCalls: string[] = [];
const sentEvents: { name: string; data: unknown }[] = [];
let refreshCalls = 0;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    refreshCalls++;
    return json({ access_token: "refreshed-access-token", expires_in: 3600 });
  }
  if (url.includes("googleapis.com/calendar/v3")) {
    if (calendarStatus !== 200) return new Response("nope", { status: calendarStatus });
    return json({ items: calendarItems });
  }
  if (url.includes("/bot")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    botCalls.push(body.meeting_url);
    return json({ id: `bot-${botCalls.length}`, status: "joining" });
  }
  if (url.includes(":8288") || url.includes("inn.gs")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    for (const e of Array.isArray(body) ? body : [body]) sentEvents.push({ name: e.name, data: e.data });
    return json({ ids: ["evt"], status: 200 });
  }
  return realFetch(input, init);
}) as typeof fetch;

// Pass-through step: runs the real closures, no memoization (that's Inngest's job, not ours).
const step = { run: async (_id: string, cb: () => unknown) => await cb() } as never;

const iso = (minsFromNow: number) => new Date(Date.now() + minsFromNow * 60_000).toISOString();

async function main() {
  // ---------- seed ----------
  const email = `cal-verify-${Date.now()}@example.com`;
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: "verify-pass-12345",
    email_confirm: true,
  });
  if (userErr) throw userErr;
  const ownerId = userData.user.id;

  const { data: client } = await admin
    .from("clients")
    .insert({ owner_id: ownerId, name: "Calendar Verify Co" })
    .select()
    .single();
  await admin
    .from("client_contacts")
    .insert({ owner_id: ownerId, client_id: client!.id, email: "known@clientco.test", name: "Known Contact" });

  const { data: integration } = await admin
    .from("integrations")
    .insert({
      owner_id: ownerId,
      category: "calendar",
      provider: "google_calendar",
      status: "connected",
      account_label: email,
      access_token: encryptSecret("stored-access-token"),
      refresh_token: encryptSecret("stored-refresh-token"),
      token_expires_at: iso(60),
    })
    .select()
    .single();

  async function cleanup() {
    await admin.from("meetings").delete().eq("owner_id", ownerId);
    await admin.from("integrations").delete().eq("owner_id", ownerId);
    await admin.from("client_contacts").delete().eq("owner_id", ownerId);
    await admin.from("clients").delete().eq("owner_id", ownerId);
    await admin.auth.admin.deleteUser(ownerId);
  }

  try {
    // ---------- 1. listUpcomingEvents filtering ----------
    console.log("\nlistUpcomingEvents (real fn, faked Google response)");
    calendarItems = [
      {
        id: "e-hangout",
        status: "confirmed",
        summary: "Kickoff",
        start: { dateTime: iso(60) },
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        attendees: [{ email: "me@self.test", self: true }, { email: "known@clientco.test" }],
      },
      {
        id: "e-conference-data",
        status: "confirmed",
        summary: "Zoom sync",
        start: { dateTime: iso(120) },
        conferenceData: {
          entryPoints: [
            { entryPointType: "phone", uri: "tel:+1234" },
            { entryPointType: "video", uri: "https://zoom.us/j/999" },
          ],
        },
        attendees: [{ email: "stranger@unknown.test" }],
      },
      { id: "e-cancelled", status: "cancelled", summary: "Dead", start: { dateTime: iso(30) }, hangoutLink: "https://meet.google.com/x" },
      { id: "e-no-video", status: "confirmed", summary: "Deskside", start: { dateTime: iso(30) } },
      { id: "e-all-day", status: "confirmed", summary: "Holiday", start: { date: "2026-08-09" }, hangoutLink: "https://meet.google.com/y" },
      {
        id: "e-declined",
        status: "confirmed",
        summary: "Not going",
        start: { dateTime: iso(45) },
        hangoutLink: "https://meet.google.com/z",
        attendees: [{ email: "me@self.test", self: true, responseStatus: "declined" }],
      },
    ];
    const events = await listUpcomingEvents("tok", { timeMinISO: iso(0), timeMaxISO: iso(1440) });
    check("keeps only the 2 real video events", events.length === 2, events.map((e) => e.googleEventId));
    check("hangoutLink used as the video link", events[0]?.videoLink === "https://meet.google.com/abc-defg-hij");
    check("conferenceData video entryPoint used when no hangoutLink", events[1]?.videoLink === "https://zoom.us/j/999");
    check("self is stripped from attendees", JSON.stringify(events[0]?.attendeeEmails) === '["known@clientco.test"]');
    check("cancelled / all-day / no-video / declined all dropped",
      !events.some((e) => ["e-cancelled", "e-all-day", "e-no-video", "e-declined"].includes(e.googleEventId)));

    calendarStatus = 401;
    let nonRetriable = false;
    try {
      await listUpcomingEvents("tok", { timeMinISO: iso(0), timeMaxISO: iso(1440) });
    } catch (err) {
      nonRetriable = (err as Error).name === "NonRetriableError";
    }
    check("401 from Google raises NonRetriableError", nonRetriable);
    calendarStatus = 200;

    // ---------- 2. token refresh ----------
    console.log("\ngetGoogleCalendarAccessToken (real DB round-trip)");
    const fresh = await getGoogleCalendarAccessToken(admin, ownerId);
    check("valid token returned decrypted, no refresh call", fresh === "stored-access-token" && refreshCalls === 0);

    await admin.from("integrations").update({ token_expires_at: iso(-5) }).eq("id", integration!.id);
    const refreshed = await getGoogleCalendarAccessToken(admin, ownerId);
    check("expired token triggers a real refresh", refreshed === "refreshed-access-token" && refreshCalls === 1);
    const { data: afterRefresh } = await admin.from("integrations").select("*").eq("id", integration!.id).single();
    check("refreshed token persisted encrypted", decryptSecret(afterRefresh!.access_token) === "refreshed-access-token");
    check("new expiry persisted in the future", new Date(afterRefresh!.token_expires_at).getTime() > Date.now());
    check("token at rest is not plaintext", !String(afterRefresh!.access_token).includes("refreshed-access-token"));

    const otherOwner = "00000000-0000-0000-0000-0000000000ff";
    check("no calendar for another owner returns null", (await getGoogleCalendarAccessToken(admin, otherOwner)) === null);

    // ---------- 3. calendarSync, real handler ----------
    console.log("\ncalendarSync (real handler, real DB)");
    type SyncHandler = (ctx: { event: { name: string; data: unknown }; step: unknown }) => Promise<{
      calendarsSynced: number;
      meetingsCreated: number;
    }>;
    const handler = (calendarSync as unknown as { fn: SyncHandler }).fn;
    const run = () => handler({ event: { name: "calendar/connected", data: { ownerId } }, step });

    const r1 = await run();
    check("2 meetings created on first sync", r1.meetingsCreated === 2, r1);
    const { data: m1 } = await admin.from("meetings").select("*").eq("owner_id", ownerId).order("starts_at");
    const known = m1!.find((m) => m.google_event_id === "e-hangout")!;
    const unknown = m1!.find((m) => m.google_event_id === "e-conference-data")!;
    check("known-client event matched to the real client", known.client_id === client!.id && known.known_client === true);
    check("known-client event got a bot sent immediately", known.skribby_bot_id !== null && botCalls.length === 1);
    check("bot was sent to the real video link", botCalls[0] === "https://meet.google.com/abc-defg-hij");
    check("known-client meeting fired meeting/confirmed", sentEvents.some((e) => e.name === "meeting/confirmed"));
    check("unknown-contact event created with NO bot", unknown.skribby_bot_id === null && unknown.known_client === false);
    check("unknown-contact event stored its video link for later confirm", unknown.meeting_url === "https://zoom.us/j/999");
    check("meeting_url + google_event_id persisted", known.meeting_url !== null && known.google_event_id === "e-hangout");

    const r2 = await run();
    check("re-sync creates no duplicates", r2.meetingsCreated === 0 && botCalls.length === 1, r2);
    const { count } = await admin.from("meetings").select("*", { count: "exact", head: true }).eq("owner_id", ownerId);
    check("still exactly 2 meeting rows", count === 2, count);

    // rescheduled in Google Calendar
    const movedTo = iso(300);
    (calendarItems[0] as { start: { dateTime: string }; summary: string }).start.dateTime = movedTo;
    (calendarItems[0] as { summary: string }).summary = "Kickoff (moved)";
    await run();
    const { data: moved } = await admin.from("meetings").select("*").eq("google_event_id", "e-hangout").single();
    check("rescheduled event updates starts_at", new Date(moved!.starts_at).toISOString() === movedTo, moved!.starts_at);
    check("renamed event updates title", moved!.title === "Kickoff (moved)");
    check("reschedule does not re-send the bot", botCalls.length === 1);

    // dismissed suggestion must stay dismissed
    await admin.from("meetings").update({ status: "dismissed" }).eq("id", unknown.id);
    (calendarItems[1] as { summary: string }).summary = "Zoom sync renamed";
    await run();
    const { data: dismissed } = await admin.from("meetings").select("*").eq("id", unknown.id).single();
    check("dismissed suggestion is not resurrected", dismissed!.status === "dismissed" && dismissed!.title === "Zoom sync");

    // a broken token marks the integration as errored instead of silently doing nothing
    await admin.from("integrations").update({ token_expires_at: iso(-5), refresh_token: null }).eq("id", integration!.id);
    await run();
    const { data: errored } = await admin.from("integrations").select("status").eq("id", integration!.id).single();
    check("unrefreshable calendar flips integration to status=error", errored!.status === "error");

    const r3 = await run();
    check("disconnected/errored calendar is skipped on later syncs", r3.calendarsSynced === 0, r3);
  } finally {
    await cleanup();
    globalThis.fetch = realFetch;
  }

  console.log(failed === 0 ? "\nAll calendar checks passed." : `\n${failed} check(s) FAILED.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
