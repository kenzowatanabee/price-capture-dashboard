import { type FC } from 'react';
import type { PriceRow } from 'services/prices';
import { downloadCsv, PRICE_COLUMNS, toCsv } from 'utils/csv';

import styles from './ExportButton.module.scss';

export interface ExportButtonProps {
  /** Rows to write, one line each. */
  rows: PriceRow[];
  /** File name without the extension. */
  filename: string;
  label?: string;
}

/** Downloads the given rows as a CSV file that opens directly in Excel. */
export const ExportButton: FC<ExportButtonProps> = ({
  rows,
  filename,
  label = 'Exportar CSV',
}) => (
  <button
    type="button"
    className={styles.ExportButton}
    disabled={!rows.length}
    onClick={() => downloadCsv(`${filename}.csv`, toCsv(rows, PRICE_COLUMNS))}
  >
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 2v8m0 0L5 7m3 3 3-3M3 13h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    {label}
  </button>
);
