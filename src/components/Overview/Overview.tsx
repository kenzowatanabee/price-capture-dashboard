import { type FC } from 'react';
import { formatPct } from 'utils/format';
import type { Overview as OverviewData } from 'utils/insights';

import styles from './Overview.module.scss';

const ratio = (part: number, whole: number) => (whole ? part / whole : null);

interface KpiProps {
  label: string;
  value: string;
  detail: string;
}

const Kpi: FC<KpiProps> = ({ label, value, detail }) => (
  <div className={styles.kpi} role="group" aria-label={label}>
    <div className={styles.label}>{label}</div>
    <div className={styles.value}>{value}</div>
    <div className={styles.detail}>{detail}</div>
  </div>
);

export interface OverviewProps {
  overview: OverviewData;
}

export const Overview: FC<OverviewProps> = ({ overview: o }) => (
  <div className={styles.Overview}>
    <div className={styles.kpis}>
      <Kpi
        label="SKUs"
        value={String(o.skus)}
        detail={`${o.stores.length} stores`}
      />
      <Kpi
        label="Prices found"
        value={formatPct(ratio(o.priced, o.checked))}
        detail={`${o.priced} of ${o.checked} store × SKU checks`}
      />
      <Kpi
        label="Purchasable"
        value={formatPct(ratio(o.purchasable, o.availabilityChecked))}
        detail={`${o.purchasable} of ${o.availabilityChecked} prices with a cart check`}
      />
      <Kpi
        label="Errors"
        value={String(o.errors)}
        detail="blocked, timeouts, parse failures"
      />
    </div>

    <div className={styles.card}>
      <table aria-label="Store health">
        <thead>
          <tr>
            <th>Store</th>
            <th>Prices found</th>
            <th>Purchasable</th>
            <th>Errors</th>
            <th>Main reasons without a price</th>
          </tr>
        </thead>
        <tbody>
          {o.stores.map((s) => (
            <tr key={s.store}>
              <td>{s.store}</td>
              <td>
                {s.priced}/{s.checked} ({formatPct(ratio(s.priced, s.checked))})
              </td>
              <td>
                {s.availabilityChecked
                  ? `${s.purchasable}/${s.availabilityChecked}`
                  : '—'}
              </td>
              <td className={s.errors ? styles.bad : undefined}>{s.errors}</td>
              <td className={styles.codes}>
                {s.topCodes
                  .slice(0, 3)
                  .map((c) => `${c.code} (${c.count})`)
                  .join(', ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
