"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { OtpCodeInput } from "./OtpCodeInput";
import styles from "./AuthCard.module.css";

export function SignUpScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", ""]);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  const complete = code.every((d) => d.length === 1);

  return (
    <div className={styles.card}>
      <div className={styles.title}>Create your account</div>
      <div className={styles.subtitle}>Solo freelancers only in v1.0.</div>

      <div className={styles.divider} />

      {stage === "email" ? (
        <>
          <SocialAuthButtons
            googleLabel="Sign up with Google"
            githubLabel="Sign up with GitHub"
            onGoogle={() => showToast("Signing up with Google…")}
            onGithub={() => showToast("Signing up with GitHub…")}
          />

          <div className={styles.orRow}>
            <div className={styles.orLine} />
            <span className={styles.orText}>or sign up with email</span>
            <div className={styles.orLine} />
          </div>

          <div className={styles.fieldLabel}>Email address</div>
          <input
            type="email"
            className={styles.emailInput}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className={styles.primaryButton}
            onClick={() => {
              if (!email.trim()) {
                showToast("Enter an email address first.");
                return;
              }
              setStage("code");
            }}
          >
            Send code →
          </button>

          <div className={styles.helperText}>We&rsquo;ll email you a 5-digit code to verify your address.</div>

          <div className={styles.divider} />

          <div className={styles.switchRow}>
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </div>
          <div className={styles.legalText}>
            By creating an account you agree to our <a href="#">Terms</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </div>
        </>
      ) : (
        <>
          <div className={styles.codeSentTo}>We sent a 5-digit code to</div>
          <div className={styles.codeEmail}>{email}</div>
          <div className={styles.changeEmailWrap}>
            <button className={styles.changeEmailLink} onClick={() => setStage("email")}>
              Change
            </button>
          </div>

          <div className={styles.fieldLabel}>Verify your email</div>
          <OtpCodeInput code={code} onChange={setCode} />

          <button
            className={styles.primaryButton}
            disabled={!complete}
            onClick={() => {
              if (complete) {
                showToast("Account created. Starting onboarding…");
                router.push("/onboarding/import");
              }
            }}
          >
            Create account →
          </button>

          <div className={styles.resendNote}>
            Code expires in 10 minutes ·{" "}
            <button className={styles.resendLink} onClick={() => showToast(`Code resent to ${email}.`)}>
              Resend code
            </button>
          </div>

          <div className={styles.postSignupNote}>
            <div className={styles.postSignupBar} />
            <span className={styles.postSignupText}>
              After setup you&rsquo;ll go through a short onboarding, takes about 2 minutes.
            </span>
          </div>
        </>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "var(--r-md)",
            fontSize: 14,
            boxShadow: "var(--shadow-pop)",
            zIndex: 20,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
