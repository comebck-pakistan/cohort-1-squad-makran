import { InputHTMLAttributes } from "react";
import styles from "./Toggle.module.css";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label, className, ...props }: ToggleProps) {
  return (
    <label className={[styles.label, className].filter(Boolean).join(" ")}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...props}
      />
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
      {label}
    </label>
  );
}
