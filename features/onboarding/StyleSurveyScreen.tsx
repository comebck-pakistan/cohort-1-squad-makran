"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import { saveVoiceProfile } from "@/lib/actions/proposals";
import styles from "./StyleSurveyScreen.module.css";

const TONE_OPTIONS = ["Direct & concise", "Warm & personal", "Technical & detailed", "Consultative"];
const LENGTH_OPTIONS = ["Short (1–2 paragraphs)", "Medium (3–4 paragraphs)", "Long (5+ paragraphs)"];
const OPENER_OPTIONS = [
  "Address the client's problem directly",
  "Introduce myself first",
  "Lead with a relevant past win",
];

interface PillGroupProps {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
}

function PillGroup({ options, value, onChange }: PillGroupProps) {
  return (
    <div className={styles.pillRow}>
      {options.map((opt) => (
        <button
          key={opt}
          className={[styles.pill, opt === value && styles.pillSelected].filter(Boolean).join(" ")}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

interface StyleSurveyScreenProps {
  /** True when the user imported 0–1 proposals in the previous step: shows the fallback-mode banner. */
  showFallbackBanner?: boolean;
}

export function StyleSurveyScreen({ showFallbackBanner }: StyleSurveyScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const importedCount = Number(searchParams.get("imported") ?? "0");
  const fallbackBanner = showFallbackBanner ?? importedCount <= 1;
  const [tone, setTone] = useState<string | null>(null);
  const [length, setLength] = useState("Medium (3–4 paragraphs)");
  const [opener, setOpener] = useState("Address the client's problem directly");
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      <OnboardingHeader current={1} />
      <div className={styles.page}>
        {fallbackBanner && (
          <div className={styles.banner}>
            <div className={styles.bannerBar} />
            <span className={styles.bannerText}>
              No proposals imported. We&rsquo;ll use your answers here as a starting point. Drafts
              won&rsquo;t be labeled &ldquo;in your voice&rdquo; until you add real examples.
            </span>
          </div>
        )}

        <h1 className={styles.h1}>Tell us how you write</h1>
        <p className={styles.lede}>Answer three quick questions. You can update these any time in Settings.</p>

        <div className={styles.questions}>
          <Card>
            <div className={styles.qEyebrow}>Question 1 of 3</div>
            <div className={styles.qTitle}>How would you describe your proposal tone?</div>
            <PillGroup options={TONE_OPTIONS} value={tone} onChange={setTone} />
          </Card>
          <Card>
            <div className={styles.qEyebrow}>Question 2 of 3</div>
            <div className={styles.qTitle}>How long do your proposals usually run?</div>
            <PillGroup options={LENGTH_OPTIONS} value={length} onChange={setLength} />
          </Card>
          <Card>
            <div className={styles.qEyebrow}>Question 3 of 3</div>
            <div className={styles.qTitle}>How do you usually open a proposal?</div>
            <PillGroup options={OPENER_OPTIONS} value={opener} onChange={setOpener} />
          </Card>
        </div>

        <div className={styles.footer}>
          <Button
            variant="secondary"
            onClick={() => {
              showToast("Returning to Import work…");
              router.push("/onboarding/import");
            }}
          >
            Back
          </Button>
          <Button
            variant="primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await saveVoiceProfile({ tone, length_preference: length, opener });
                showToast("Saved. Continuing to Connect…");
                router.push("/onboarding/connect");
              } catch {
                showToast("Could not save. Try again.");
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save & continue"}
          </Button>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
