import { type FC } from 'react';

import styles from './charts.module.scss';

export interface RankedBarItem {
  key: string;
  label: string;
  /** Bar length; null draws no bar (e.g. nothing to compare). */
  value: number | null;
  valueText: string;
  detail?: string;
}

export interface RankedBarsProps {
  items: RankedBarItem[];
  label: string;
  /** Value of a full-width bar; defaults to the largest value. */
  max?: number;
}

/** Room left beside the longest bar for its value label (share of the track). */
const LABEL_ROOM = 0.18;

/** Horizontal bars on one baseline, one hue, value printed at the tip. Order is the caller's. */
export const RankedBars: FC<RankedBarsProps> = ({ items, label, max }) => {
  const top = max ?? Math.max(0, ...items.map((i) => i.value ?? 0));
  return (
    <ol className={styles.ranked} aria-label={label}>
      {items.map((item) => {
        const width =
          top > 0 && item.value != null
            ? (Math.max(0, item.value) / top) * (1 - LABEL_ROOM) * 100
            : 0;
        return (
          <li
            key={item.key}
            className={styles.rankedRow}
            tabIndex={0}
            aria-label={`${item.label}: ${item.valueText}${item.detail ? `, ${item.detail}` : ''}`}
          >
            <div className={styles.rankedLabel}>{item.label}</div>
            <div className={styles.track}>
              {width > 0 && (
                <div className={styles.bar} style={{ width: `${width}%` }} />
              )}
              <span className={styles.rankedValue}>{item.valueText}</span>
            </div>
            {item.detail && (
              <div className={styles.rankedDetail}>{item.detail}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
};
