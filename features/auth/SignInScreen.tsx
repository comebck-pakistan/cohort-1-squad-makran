"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { OtpCodeInput } from "./OtpCodeInput";
import styles from "./AuthCard.module.css";

export function SignInScreen() {
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) showToast(error.message);
  }

  async function sendCode() {
    if (!email.trim()) {
      showToast("Enter an email address first.");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
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
    showToast("Signed in.");
    router.push("/home");
  }

  const complete = code.every((d) => d.length === 1);

  return (
    <div className={styles.card}>
      <div className={styles.title}>Welcome back</div>
      <div className={styles.subtitle}>Sign in to your account.</div>

      <div className={styles.divider} />

      {stage === "email" ? (
        <>
          <SocialAuthButtons
            googleLabel="Continue with Google"
            githubLabel="Continue with GitHub"
            onGoogle={() => handleOAuth("google")}
            onGithub={() => handleOAuth("github")}
          />

          <div className={styles.orRow}>
            <div className={styles.orLine} />
            <span className={styles.orText}>or sign in with email</span>
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

          <div className={styles.helperText}>No password needed. We&rsquo;ll email you a 6-digit code.</div>

          <div className={styles.divider} />

          <div className={styles.switchRow}>
            No account yet? <Link href="/sign-up">Sign up</Link>
          </div>
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

          <div className={styles.fieldLabel}>Enter your code</div>
          <OtpCodeInput code={code} onChange={setCode} />

          <button
            className={styles.primaryButton}
            disabled={!complete || verifying}
            onClick={verifyCode}
          >
            {verifying ? "Signing in…" : "Sign in"}
          </button>

          <div className={styles.resendNote}>
            Code expires in 10 minutes ·{" "}
            <button className={styles.resendLink} onClick={sendCode}>
              Resend code
            </button>
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
