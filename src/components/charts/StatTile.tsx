import { type FC, type ReactNode } from 'react';

import styles from './charts.module.scss';

export interface StatTileProps {
  label: string;
  value: string;
  detail?: ReactNode;
}

export const StatTile: FC<StatTileProps> = ({ label, value, detail }) => (
  <div className={styles.tile} role="group" aria-label={label}>
    <div className={styles.tileLabel}>{label}</div>
    <div className={styles.tileValue}>{value}</div>
    {detail && <div className={styles.tileDetail}>{detail}</div>}
  </div>
);

export const Card: FC<{
  title: string;
  subtitle?: string;
  children: ReactNode;
}> = ({ title, subtitle, children }) => (
  <section className={styles.card} aria-label={title}>
    <header className={styles.cardHeader}>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </header>
    {children}
  </section>
);
