import type { ScrapedJobPage } from "./scrape";

/** Defaults to local dev; no .env file here (same permission wall as the main app's .env.local). */
const APP_URL = process.env.PLASMO_PUBLIC_APP_URL || "http://localhost:3000";

const TOKEN_KEY = "extensionToken";

export async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  return (result[TOKEN_KEY] as string | undefined) ?? null;
}

export async function setStoredToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function clearStoredToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY);
}

export interface ClientAnalysis {
  name: string;
  confidence_tier: "full" | "low" | "insufficient";
  verdict: "BID" | "NO-BID" | "MAYBE" | "New · Unverified" | null;
  price_band_min: string | null;
  price_band_max: string | null;
  price_band_low_confidence: boolean;
  hires_count: number;
  payment_verified: boolean;
  spend_visible: boolean;
}

export interface AnalyzeClientResponse {
  client: ClientAnalysis;
  reasoning?: string;
  cached: boolean;
}

export class ExtensionAuthError extends Error {}

export async function analyzeClient(scraped: ScrapedJobPage): Promise<AnalyzeClientResponse> {
  const token = await getStoredToken();
  if (!token) throw new ExtensionAuthError("Not signed in.");

  const res = await fetch(`${APP_URL}/api/extension/analyze-client`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      jobUrl: scraped.jobUrl,
      jobTitle: scraped.jobTitle,
      jobDescription: scraped.jobDescription,
      postedBudget: scraped.postedBudget,
      signals: scraped.signals,
    }),
  });

  if (res.status === 401) {
    await clearStoredToken();
    throw new ExtensionAuthError("Token invalid or revoked.");
  }
  if (!res.ok) throw new Error(`Analysis failed (${res.status}).`);

  return res.json() as Promise<AnalyzeClientResponse>;
}
