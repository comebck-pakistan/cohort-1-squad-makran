import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listIntegrations, createIntegration, updateIntegration } from "@/lib/db/integrations";
import { getAuthenticatedLogin } from "@/lib/github";
import { encryptSecret } from "@/lib/crypto";

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
    .find((c) => c.startsWith("github_oauth_state="))
    ?.split("=")[1];

  if (oauthError) {
    return fail(request, oauthError === "access_denied" ? "github_oauth_denied" : oauthError);
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return fail(request, "github_oauth_state_mismatch");
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(request, "github_oauth_not_configured");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/github/oauth/callback`;

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return fail(request, tokenData.error ?? "github_token_exchange_failed");
  }

  const login = await getAuthenticatedLogin(tokenData.access_token);
  const encrypted = encryptSecret(tokenData.access_token);

  const existing = (await listIntegrations(supabase)).find(
    (i) => i.category === "repo" && i.provider === "github"
  );
  if (existing) {
    await updateIntegration(supabase, existing.id, {
      status: "connected",
      connected_at: new Date().toISOString(),
      account_label: login,
      access_token: encrypted,
    });
  } else {
    await createIntegration(supabase, {
      owner_id: user.id,
      category: "repo",
      provider: "github",
      status: "connected",
      connected_at: new Date().toISOString(),
      account_label: login,
      access_token: encrypted,
      refresh_token: null,
      token_expires_at: null,
    });
  }

  const response = NextResponse.redirect(new URL("/settings/integrations?connected=github", request.url));
  response.cookies.set("github_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
