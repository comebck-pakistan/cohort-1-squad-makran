// M2 exit-criteria check: every table round-trips through its repo function,
// and RLS actually blocks cross-user access. Run against the local Supabase
// stack only (`npx supabase start` first): node scripts/rls-test.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANON_KEY || !SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (from `npx supabase status`).");
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY);

const TABLES = [
  "clients", "client_contacts", "integrations", "repos",
  "meetings", "tickets", "agent_runs", "proposals",
];

let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    console.log(`  FAIL ${label}`);
    failed++;
  }
}

async function createConfirmedUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  return data.user;
}

async function sessionFor(userId) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: (await admin.auth.admin.getUserById(userId)).data.user.email,
  });
  if (error) throw error;
  const client = createClient(URL, ANON_KEY);
  const { data: verified, error: verifyError } = await client.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) throw verifyError;
  return { client, session: verified.session };
}

async function main() {
  console.log("Creating two test users...");
  const userA = await createConfirmedUser(`rls-test-a-${Date.now()}@example.com`);
  const userB = await createConfirmedUser(`rls-test-b-${Date.now()}@example.com`);
  const { client: clientA } = await sessionFor(userA.id);
  const { client: clientB } = await sessionFor(userB.id);

  console.log("\nRound-trip: insert as A, read back as A, on every table.");

  const { data: clientRow, error: clientErr } = await clientA
    .from("clients")
    .insert({ owner_id: userA.id, name: "RLS Test Client" })
    .select()
    .single();
  check("clients insert+select as owner", !clientErr && clientRow?.name === "RLS Test Client");

  const { data: contactRow, error: contactErr } = await clientA
    .from("client_contacts")
    .insert({ owner_id: userA.id, client_id: clientRow.id, email: "contact@example.com" })
    .select()
    .single();
  check("client_contacts insert+select as owner", !contactErr && !!contactRow);

  const { data: integrationRow, error: integrationErr } = await clientA
    .from("integrations")
    .insert({ owner_id: userA.id, category: "repo", provider: "github" })
    .select()
    .single();
  check("integrations insert+select as owner", !integrationErr && !!integrationRow);

  const { data: repoRow, error: repoErr } = await clientA
    .from("repos")
    .insert({
      owner_id: userA.id,
      integration_id: integrationRow.id,
      provider: "github",
      full_name: "owner/repo",
    })
    .select()
    .single();
  check("repos insert+select as owner", !repoErr && !!repoRow);

  const { data: meetingRow, error: meetingErr } = await clientA
    .from("meetings")
    .insert({
      owner_id: userA.id,
      client_id: clientRow.id,
      title: "RLS Test Meeting",
      source: "manual_paste",
      starts_at: new Date().toISOString(),
    })
    .select()
    .single();
  check("meetings insert+select as owner", !meetingErr && !!meetingRow);

  const { data: ticketRow, error: ticketErr } = await clientA
    .from("tickets")
    .insert({ owner_id: userA.id, client_id: clientRow.id, repo_id: repoRow.id, title: "RLS Test Ticket" })
    .select()
    .single();
  check("tickets insert+select as owner", !ticketErr && !!ticketRow);

  const { data: agentRunRow, error: agentRunErr } = await clientA
    .from("agent_runs")
    .insert({ owner_id: userA.id, ticket_id: ticketRow.id, attempt_number: 1 })
    .select()
    .single();
  check("agent_runs insert+select as owner", !agentRunErr && !!agentRunRow);

  const { data: proposalRow, error: proposalErr } = await clientA
    .from("proposals")
    .insert({ owner_id: userA.id, client_id: clientRow.id, title: "RLS Test Proposal", body: "body" })
    .select()
    .single();
  check("proposals insert+select as owner", !proposalErr && !!proposalRow);

  console.log("\nCross-user access as B, must be blocked on every table.");

  for (const table of TABLES) {
    const { data, error } = await clientB.from(table).select("*").eq("owner_id", userA.id);
    check(`${table} select as non-owner returns nothing`, !error && data.length === 0);
  }

  const { error: crossInsertErr } = await clientB
    .from("clients")
    .insert({ owner_id: userA.id, name: "Should be rejected" });
  check("clients insert with someone else's owner_id is rejected", !!crossInsertErr);

  const { error: crossUpdateErr } = await clientB
    .from("clients")
    .update({ name: "Hijacked" })
    .eq("id", clientRow.id);
  check("clients update on someone else's row is a no-op", !crossUpdateErr);
  const { data: unchanged } = await admin.from("clients").select("name").eq("id", clientRow.id).single();
  check("clients row unchanged after non-owner update attempt", unchanged?.name === "RLS Test Client");

  console.log("\nCleanup...");
  await admin.from("clients").delete().eq("id", clientRow.id);
  await admin.auth.admin.deleteUser(userA.id);
  await admin.auth.admin.deleteUser(userB.id);

  console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
