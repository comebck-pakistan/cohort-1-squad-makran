import { ReactNode } from "react";
import styles from "./DataTable.module.css";

interface DataTableProps<T> {
  columns: string[];
  /** CSS grid-template-columns value shared by header and rows. */
  templateColumns: string;
  rows: T[];
  rowKey: (row: T) => string;
  renderRow: (row: T) => ReactNode[];
  onRowClick?: (row: T) => void;
  /** Shown instead of rows when the list is empty: always an invitation, not mood copy. */
  emptyState: ReactNode;
}

/** Shared row-grid list pattern used across Home, Tickets, Proposals, Clients. */
export function DataTable<T>({
  columns,
  templateColumns,
  rows,
  rowKey,
  renderRow,
  onRowClick,
  emptyState,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className={styles.table}>
        <div className={styles.empty}>{emptyState}</div>
      </div>
    );
  }

  return (
    <div className={styles.table}>
      <div className={styles.headRow} style={{ gridTemplateColumns: templateColumns }}>
        {columns.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={rowKey(row)}
          className={[styles.row, onRowClick && styles.rowClickable].filter(Boolean).join(" ")}
          style={{ gridTemplateColumns: templateColumns }}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {renderRow(row).map((cell, i) => (
            <span key={i}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
