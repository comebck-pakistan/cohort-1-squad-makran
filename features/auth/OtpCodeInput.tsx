import { ChangeEvent, KeyboardEvent } from "react";
import styles from "./AuthCard.module.css";

const LENGTH = 6;

interface OtpCodeInputProps {
  code: string[];
  onChange: (code: string[]) => void;
}

/** Passwordless auth: 6-digit OTP email code (Supabase Auth enforces a 6-digit floor; design-system.md originally specified 5). */
export function OtpCodeInput({ code, onChange }: OtpCodeInputProps) {
  function updateDigit(i: number, e: ChangeEvent<HTMLInputElement>) {
    const clean = e.target.value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...code];
    next[i] = clean;
    onChange(next);
    if (clean) {
      const nextInput = e.target.nextElementSibling as HTMLInputElement | null;
      nextInput?.focus();
    }
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      const prevInput = e.currentTarget.previousElementSibling as HTMLInputElement | null;
      prevInput?.focus();
    }
  }

  return (
    <div className={styles.codeRow}>
      {Array.from({ length: LENGTH }).map((_, i) => (
        <input
          key={i}
          className={styles.codeBox}
          value={code[i] ?? ""}
          maxLength={1}
          inputMode="numeric"
          onChange={(e) => updateDigit(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
