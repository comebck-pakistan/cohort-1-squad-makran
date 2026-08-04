import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (!process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID || !process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=google_oauth_not_configured", request.url)
    );
  }

  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(getAuthUrl(state));
  response.cookies.set("google_calendar_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
