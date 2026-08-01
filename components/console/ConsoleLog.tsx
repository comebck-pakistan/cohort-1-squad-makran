import styles from "./ConsoleLog.module.css";

export interface ConsoleLine {
  time: string;
  text: string;
  /** Terminal pass/fail line, mint (--console-ok). */
  ok?: boolean;
  /** Current/in-flight step, periwinkle (--console-signal) + pulsing dot. */
  active?: boolean;
}

interface ConsoleLogProps {
  lines: ConsoleLine[];
}

/** The one confined dark surface in the product: agent live execution log only. */
export function ConsoleLog({ lines }: ConsoleLogProps) {
  return (
    <div className={styles.log}>
      {lines.map((l, i) => (
        <div
          key={i}
          className={[styles.line, l.ok && styles.ok, l.active && styles.active]
            .filter(Boolean)
            .join(" ")}
        >
          <span className={styles.time}>{l.time}</span>
          {l.active && <span className={styles.dot} />}
          <span>{l.text}</span>
        </div>
      ))}
    </div>
  );
}
