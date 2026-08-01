import { InputHTMLAttributes, forwardRef } from "react";
import styles from "./Input.module.css";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  const classes = [styles.input, className].filter(Boolean).join(" ");
  return <input ref={ref} className={classes} {...props} />;
});
