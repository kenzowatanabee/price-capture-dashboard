import { type FC } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { storeColor } from 'utils/colors';
import { formatBRL } from 'utils/format';
import type { HistorySeries } from 'utils/insights';

import styles from './HistoryChart.module.scss';

export interface HistoryChartProps {
  series: HistorySeries;
}

export const HistoryChart: FC<HistoryChartProps> = ({ series }) => {
  if (!series.points.length) {
    return (
      <div className={styles.empty}>No prices recorded for this SKU yet.</div>
    );
  }
  return (
    <div className={styles.HistoryChart}>
      <div className={`${styles.card} ${styles.chart}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series.points}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => formatBRL(v)}
              width={84}
            />
            <Tooltip
              formatter={(v) => formatBRL(typeof v === 'number' ? v : null)}
            />
            <Legend />
            {series.stores.map((store, i) => (
              <Line
                key={store}
                type="stepAfter"
                dataKey={store}
                stroke={storeColor(i)}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.card}>
        <table aria-label="Price summary">
          <thead>
            <tr>
              <th>Store</th>
              <th className={styles.num}>Latest</th>
              <th className={styles.num}>Lowest</th>
              <th className={styles.num}>Highest</th>
            </tr>
          </thead>
          <tbody>
            {series.summary.map((s, i) => (
              <tr key={s.store}>
                <td>
                  <span
                    className={styles.swatch}
                    style={{ background: storeColor(i) }}
                  />
                  {s.store}
                </td>
                <td className={styles.num}>{formatBRL(s.latest)}</td>
                <td className={styles.num}>{formatBRL(s.min)}</td>
                <td className={styles.num}>{formatBRL(s.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
