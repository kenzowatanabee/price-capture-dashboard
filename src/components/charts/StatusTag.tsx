import { type FC } from 'react';

import styles from './charts.module.scss';

export type StatusKind = 'good' | 'warning' | 'critical';

const ICONS: Record<StatusKind, string> = {
  good: '✓',
  warning: '!',
  critical: '✕',
};

/** A status shown as icon + label, so it never relies on colour alone. */
export const StatusTag: FC<{ kind: StatusKind; label: string }> = ({
  kind,
  label,
}) => (
  <span className={styles.status}>
    <span className={`${styles.statusIcon} ${styles[kind]}`} aria-hidden="true">
      {ICONS[kind]}
    </span>
    {label}
  </span>
);
