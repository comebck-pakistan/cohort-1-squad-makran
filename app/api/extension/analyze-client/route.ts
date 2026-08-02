import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { findOwnerByExtensionToken } from "@/lib/db/extension-tokens";
import { upsertClientAnalysis, findClientByUpworkUrl } from "@/lib/db/clients";
import { computeConfidenceTier, type ScrapedClientSignals } from "@/lib/client-analysis/tier";
import { analyzeClient } from "@/lib/llm/client-analysis";
import { parseRateHistory } from "@/lib/rates";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && origin.startsWith("chrome-extension://") ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

interface AnalyzeClientPayload {
  jobUrl: string;
  jobTitle: string;
  jobDescription: string;
  postedBudget: string | null;
  signals: ScrapedClientSignals;
}

export async function POST(request: Request) {
  const cors = corsHeaders(request.headers.get("origin"));
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401, headers: cors });
  }

  const supabase = createServiceClient();
  const ownerId = await findOwnerByExtensionToken(supabase, token);
  if (!ownerId) {
    return NextResponse.json({ error: "Invalid or revoked extension token." }, { status: 401, headers: cors });
  }

  const payload = (await request.json()) as AnalyzeClientPayload;
  const { jobUrl, jobTitle, jobDescription, postedBudget, signals } = payload;

  const dataHash = createHash("sha256")
    .update(JSON.stringify({ postedBudget, signals }))
    .digest("hex");

  const existing = await findClientByUpworkUrl(supabase, ownerId, jobUrl);
  if (
    existing?.last_analyzed_data_hash === dataHash &&
    existing.last_analyzed_at &&
    Date.now() - new Date(existing.last_analyzed_at).getTime() < THIRTY_DAYS_MS
  ) {
    return NextResponse.json({ client: existing, cached: true }, { headers: cors });
  }

  const { tier, signalsVerified } = computeConfidenceTier(signals);

  const {
    data: { user },
  } = await supabase.auth.admin.getUserById(ownerId);
  const rateHistory = parseRateHistory(user?.user_metadata);

  const analysis = await analyzeClient({
    jobTitle,
    jobDescription,
    postedBudget,
    tier,
    signalsVerified,
    rateHistory,
  });

  const client = await upsertClientAnalysis(supabase, ownerId, jobUrl, {
    name: jobTitle,
    confidence_tier: tier,
    verdict: analysis.verdict,
    price_band_min: analysis.priceBand?.min ?? null,
    price_band_max: analysis.priceBand?.max ?? null,
    price_band_low_confidence: analysis.priceBand?.low ?? false,
    hires_count: signals.hiresCount ?? 0,
    reviews_visible: signals.reviewsVisible,
    spend_visible: (signals.totalSpentUsd ?? 0) > 0,
    payment_verified: signals.paymentVerified === true,
    last_analyzed_data_hash: dataHash,
    last_analyzed_at: new Date().toISOString(),
  });

  return NextResponse.json({ client, reasoning: analysis.reasoning, cached: false }, { headers: cors });
}
