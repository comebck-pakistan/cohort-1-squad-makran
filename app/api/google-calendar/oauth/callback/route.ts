import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listIntegrations, createIntegration, updateIntegration } from "@/lib/db/integrations";
import { exchangeCode, getUserEmail } from "@/lib/google-calendar";
import { encryptSecret } from "@/lib/crypto";
import { inngest } from "@/inngest/client";

function fail(request: Request, reason: string) {
  return NextResponse.redirect(new URL(`/settings/integrations?error=${reason}`, request.url));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(request, "not_signed_in");

  const cookieState = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith("google_calendar_oauth_state="))
    ?.split("=")[1];

  if (oauthError) {
    return fail(request, oauthError === "access_denied" ? "google_oauth_denied" : oauthError);
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return fail(request, "google_oauth_state_mismatch");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (err) {
    return fail(request, err instanceof Error ? err.message : "google_token_exchange_failed");
  }
  if (!tokens.refreshToken) {
    return fail(request, "google_no_refresh_token");
  }

  const email = await getUserEmail(tokens.accessToken);
  const expiresAt = new Date(Date.now() + tokens.expiresInSec * 1000).toISOString();

  const existing = (await listIntegrations(supabase)).find(
    (i) => i.category === "calendar" && i.provider === "google_calendar"
  );
  const patch = {
    status: "connected" as const,
    connected_at: new Date().toISOString(),
    account_label: email,
    access_token: encryptSecret(tokens.accessToken),
    refresh_token: encryptSecret(tokens.refreshToken),
    token_expires_at: expiresAt,
  };
  if (existing) {
    await updateIntegration(supabase, existing.id, patch);
  } else {
    await createIntegration(supabase, { owner_id: user.id, category: "calendar", provider: "google_calendar", ...patch });
  }

  await inngest.send({ name: "calendar/connected", data: { ownerId: user.id } });

  const response = NextResponse.redirect(new URL("/settings/integrations?connected=google_calendar", request.url));
  response.cookies.set("google_calendar_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
