import { ButtonHTMLAttributes } from "react";
import styles from "./ConsoleButton.module.css";

type ConsoleButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function ConsoleButton({ className, ...props }: ConsoleButtonProps) {
  return <button className={[styles.button, className].filter(Boolean).join(" ")} {...props} />;
}
