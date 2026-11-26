import { type FC, type ReactNode } from 'react';

import styles from './charts.module.scss';

export interface MeterItem {
  key: string;
  label: string;
  part: number;
  whole: number;
  valueText: string;
  extra?: ReactNode;
}

/** One ratio per named row, bars aligned, on a lighter track of the same hue. */
export const MeterList: FC<{ items: MeterItem[]; label: string }> = ({
  items,
  label,
}) => (
  <ul className={styles.meters} aria-label={label}>
    {items.map((item) => {
      const share = item.whole ? Math.min(1, item.part / item.whole) : 0;
      return (
        <li
          key={item.key}
          className={styles.meterRow}
          tabIndex={0}
          aria-label={`${item.label}: ${item.valueText}`}
        >
          <div className={styles.rankedLabel}>{item.label}</div>
          <div
            className={styles.meterTrack}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={item.whole}
            aria-valuenow={item.part}
            aria-label={`${item.label}`}
          >
            <div
              className={styles.meterFill}
              style={{ width: `${share * 100}%` }}
            />
          </div>
          <div className={styles.meterValue}>{item.valueText}</div>
          {item.extra && <div className={styles.meterExtra}>{item.extra}</div>}
        </li>
      );
    })}
  </ul>
);
