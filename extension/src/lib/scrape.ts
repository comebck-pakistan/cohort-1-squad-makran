export interface ScrapedJobPage {
  jobUrl: string;
  jobTitle: string;
  jobDescription: string;
  postedBudget: string | null;
  memberSinceLabel: string | null;
  countryLabel: string | null;
  signals: {
    paymentVerified: boolean | null;
    totalSpentUsd: number | null;
    hiresCount: number | null;
    reviewsVisible: boolean;
  };
}

/**
 * Runs inside the Upwork tab via chrome.scripting.executeScript, isolated world, no access to
 * the extension's other modules or imports, only the DOM. Real page structure confirmed live
 * 2026-08-03 (logged out): job title is the page's one <h1>, description sits under
 * [data-test="Description"], and the "About the client" sidebar is plain text, no data-test
 * hooks there, so it's parsed by known UI-copy label patterns (Upwork's actual user-facing
 * strings, more stable across deploys than internal class names). Payment-verified and star
 * rating only render for a logged-in viewer, verified absent when logged out, read defensively
 * here (label search, null if not found) rather than assumed present.
 */
export function scrapeUpworkJobPage(): ScrapedJobPage {
  const jobTitle = document.querySelector("h1")?.textContent?.trim() ?? "";

  const descriptionEl = document.querySelector('[data-test="Description"]');
  const jobDescription = (descriptionEl?.textContent ?? "").trim().replace(/^Summary\s*/, "");

  const bodyText = document.body.innerText;

  const hourlyMatch = bodyText.match(/\$[\d,]+(?:\.\d{2})?\s*-\s*\$[\d,]+(?:\.\d{2})?\s*Hourly/i);
  const fixedMatch = bodyText.match(/Est\.?\s*budget:?\s*\$[\d,]+(?:\.\d{2})?/i);
  const postedBudget = hourlyMatch?.[0]?.replace(/\s*Hourly/i, "/hr") ?? fixedMatch?.[0] ?? null;

  const aboutIdx = bodyText.indexOf("About the client");
  const aboutBlock = aboutIdx >= 0 ? bodyText.slice(aboutIdx, aboutIdx + 600) : "";

  const memberSinceMatch = aboutBlock.match(/Member since ([A-Za-z]+ \d{1,2},? \d{4})/);
  const memberSinceLabel = memberSinceMatch?.[1] ?? null;

  const countryMatch = aboutBlock.match(/Member since [^\n]*\n([^\n$]+)\n/);
  const countryLabel = countryMatch?.[1]?.trim() || null;

  const spentMatch = aboutBlock.match(/\$([\d,.]+)([KkMm]?)\s*total spent/);
  let totalSpentUsd: number | null = null;
  if (spentMatch) {
    const raw = parseFloat(spentMatch[1].replace(/,/g, ""));
    const unit = spentMatch[2].toLowerCase();
    totalSpentUsd = unit === "k" ? raw * 1_000 : unit === "m" ? raw * 1_000_000 : raw;
  }

  const hiresMatch = aboutBlock.match(/(\d+)\s*hires?,\s*\d+\s*active/i);
  const hiresCount = hiresMatch ? parseInt(hiresMatch[1], 10) : null;

  const paymentVerified = /payment method verified/i.test(aboutBlock)
    ? true
    : /payment[^a-z]{0,20}unverified/i.test(aboutBlock)
      ? false
      : null;

  const reviewsVisible = /\d\.\d\s*(out of 5|stars)/i.test(aboutBlock);

  return {
    jobUrl: location.href.split("?")[0],
    jobTitle,
    jobDescription,
    postedBudget,
    memberSinceLabel,
    countryLabel,
    signals: { paymentVerified, totalSpentUsd, hiresCount, reviewsVisible },
  };
}

export function isUpworkJobPage(url: string): boolean {
  return /upwork\.com\/(jobs|freelance-jobs\/apply)\//i.test(url);
}
