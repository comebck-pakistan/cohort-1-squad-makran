import { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  raised?: boolean;
  eyebrow?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
}

export function Card({ raised, eyebrow, title, children, className, ...props }: CardProps) {
  const classes = [styles.card, raised && styles.raised, className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...props}>
      {(eyebrow || title) && (
        <div className={styles.header}>
          {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
          {title && <div className={styles.title}>{title}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
