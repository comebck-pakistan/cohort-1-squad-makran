"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { OtpCodeInput } from "./OtpCodeInput";
import styles from "./AuthCard.module.css";

export function SignUpScreen() {
  const router = useRouter();
  const supabase = createClient();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function handleOAuth(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/import` },
    });
    if (error) showToast(error.message);
  }

  async function sendCode() {
    if (!email.trim()) {
      showToast("Enter an email address first.");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setSending(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setStage("code");
  }

  async function verifyCode() {
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.join(""),
      type: "email",
    });
    setVerifying(false);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("Account created. Starting onboarding…");
    router.push("/onboarding/import");
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
            onGoogle={() => handleOAuth("google")}
            onGithub={() => handleOAuth("github")}
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

          <button className={styles.primaryButton} onClick={sendCode} disabled={sending}>
            {sending ? "Sending…" : "Send code →"}
          </button>

          <div className={styles.helperText}>We&rsquo;ll email you a 6-digit code to verify your address.</div>

          <div className={styles.divider} />

          <div className={styles.switchRow}>
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </div>
          <div className={styles.legalText}>By creating an account you agree to our Terms and Privacy Policy.</div>
        </>
      ) : (
        <>
          <div className={styles.codeSentTo}>We sent a 6-digit code to</div>
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
            disabled={!complete || verifying}
            onClick={verifyCode}
          >
            {verifying ? "Creating account…" : "Create account →"}
          </button>

          <div className={styles.resendNote}>
            Code expires in 10 minutes ·{" "}
            <button className={styles.resendLink} onClick={sendCode}>
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
