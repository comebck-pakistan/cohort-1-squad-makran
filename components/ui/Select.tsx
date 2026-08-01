import { SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  placeholder?: string;
  /** Visually flags the field as needing a choice (signal-colored border), per design system spec. */
  required?: boolean;
}

export function Select({ options, placeholder, required, className, ...props }: SelectProps) {
  const classes = [styles.select, required && styles.required, className]
    .filter(Boolean)
    .join(" ");
  return (
    <select className={classes} required={required} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
