import { type FC, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CONTEXT_COLOR,
  MAX_HIGHLIGHTED,
  SERIES_COLORS,
  type SlotMap,
} from 'utils/colors';
import { formatBRL, shortDate } from 'utils/format';
import type { HistoryPoint, HistorySeries } from 'utils/insights';

import styles from './HistoryChart.module.scss';

const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const MUTED = '#898781';
const SURFACE = '#ffffff';

const colorOf = (store: string, slots: SlotMap) =>
  store in slots ? SERIES_COLORS[slots[store]] : CONTEXT_COLOR;

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey?: string | number; value?: unknown }[];
  slots: SlotMap;
}

/** One tooltip for every store at the hovered date: value first, cheapest first, line keys. */
const HistoryTooltip: FC<TooltipProps> = ({
  active,
  label,
  payload,
  slots,
}) => {
  if (!active || !payload?.length) return null;
  const rows = payload
    .filter(
      (p): p is { dataKey: string; value: number } =>
        typeof p.value === 'number',
    )
    .sort((a, b) => a.value - b.value);
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{shortDate(String(label))}</div>
      {rows.map((p) => (
        <div
          key={p.dataKey}
          className={`${styles.tooltipRow} ${p.dataKey in slots ? '' : styles.context}`}
        >
          <span
            className={styles.key}
            style={{ background: colorOf(p.dataKey, slots) }}
          />
          <strong>{formatBRL(p.value)}</strong>
          <span>{p.dataKey}</span>
        </div>
      ))}
    </div>
  );
};

/** Index of the last point where the store has a price (for its end dot). */
const lastIndex = (points: HistoryPoint[], store: string) => {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (typeof points[i][store] === 'number') return i;
  }
  return -1;
};

export interface HistoryChartProps {
  series: HistorySeries;
  /** Highlighted stores and their colour slot. */
  slots: SlotMap;
  onToggle?: (store: string) => void;
}

export const HistoryChart: FC<HistoryChartProps> = ({
  series,
  slots,
  onToggle,
}) => {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  if (!series.points.length) {
    return (
      <div className={styles.empty}>No prices recorded for this SKU yet.</div>
    );
  }

  // cheapest first by latest price; stores without a price last
  const stores = [...series.summary].sort(
    (a, b) =>
      (a.latest ?? Infinity) - (b.latest ?? Infinity) ||
      a.store.localeCompare(b.store),
  );
  const highlighted = stores
    .filter((s) => s.store in slots)
    .map((s) => s.store);
  const context = stores.filter((s) => !(s.store in slots)).map((s) => s.store);
  const full = highlighted.length >= MAX_HIGHLIGHTED;

  return (
    <div className={styles.HistoryChart}>
      <section className={styles.card} aria-label="Price over time">
        <div className={styles.cardTop}>
          <div>
            <h2>Price over time</h2>
            <p>
              Last price of each day · highlighted stores in colour, the rest in
              grey
            </p>
          </div>
          <div className={styles.views} role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={view === 'chart'}
              onClick={() => setView('chart')}
            >
              Chart
            </button>
            <button
              type="button"
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
            >
              Table
            </button>
          </div>
        </div>

        {view === 'chart' ? (
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series.points}
                margin={{ top: 12, right: 16, bottom: 4, left: 4 }}
              >
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  stroke={AXIS}
                  tick={{ fill: MUTED, fontSize: 12 }}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => formatBRL(v)}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: MUTED, fontSize: 12 }}
                  width={78}
                />
                <Tooltip
                  content={<HistoryTooltip slots={slots} />}
                  cursor={{ stroke: AXIS, strokeWidth: 1 }}
                  isAnimationActive={false}
                />
                {[...context, ...highlighted].map((store) => {
                  const on = store in slots;
                  const color = colorOf(store, slots);
                  const last = lastIndex(series.points, store);
                  return (
                    <Line
                      key={store}
                      type="stepAfter"
                      dataKey={store}
                      stroke={color}
                      strokeWidth={on ? 2 : 1}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      connectNulls
                      isAnimationActive={false}
                      dot={(props: {
                        cx?: number;
                        cy?: number;
                        index?: number;
                      }) =>
                        on &&
                        props.index === last &&
                        props.cx != null &&
                        props.cy != null ? (
                          <circle
                            key={`${store}-end`}
                            cx={props.cx}
                            cy={props.cy}
                            r={4}
                            fill={color}
                            stroke={SURFACE}
                            strokeWidth={2}
                          />
                        ) : (
                          <g key={`${store}-${props.index}`} />
                        )
                      }
                      activeDot={
                        on
                          ? {
                              r: 4,
                              fill: color,
                              stroke: SURFACE,
                              strokeWidth: 2,
                            }
                          : false
                      }
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table aria-label="Price history table">
              <thead>
                <tr>
                  <th>Date</th>
                  {stores.map((s) => (
                    <th key={s.store} className={styles.num}>
                      {s.store}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...series.points].reverse().map((p) => (
                  <tr key={p.date}>
                    <td>{shortDate(p.date)}</td>
                    {stores.map((s) => (
                      <td key={s.store} className={styles.num}>
                        {formatBRL(
                          typeof p[s.store] === 'number'
                            ? (p[s.store] as number)
                            : null,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.card} aria-label="Stores">
        <div className={styles.cardTop}>
          <div>
            <h2>Stores</h2>
            <p>Cheapest first · click to highlight (up to {MAX_HIGHLIGHTED})</p>
          </div>
        </div>
        <div className={styles.storeHead} aria-hidden="true">
          <span />
          <span>Store</span>
          <span className={styles.num}>Latest</span>
          <span className={styles.num}>Lowest</span>
          <span className={styles.num}>Highest</span>
        </div>
        <ul className={styles.stores} aria-label="Price summary">
          {stores.map((s) => {
            const on = s.store in slots;
            return (
              <li key={s.store}>
                <button
                  type="button"
                  className={styles.store}
                  aria-pressed={on}
                  disabled={!on && (full || !onToggle)}
                  title={
                    !on && full
                      ? `Up to ${MAX_HIGHLIGHTED} stores can be highlighted`
                      : undefined
                  }
                  onClick={() => onToggle?.(s.store)}
                >
                  <span
                    className={styles.key}
                    style={{ background: colorOf(s.store, slots) }}
                  />
                  <span className={styles.storeName} title={s.store}>
                    {s.store}
                  </span>
                  <span className={styles.num}>{formatBRL(s.latest)}</span>
                  <span className={styles.num}>{formatBRL(s.min)}</span>
                  <span className={styles.num}>{formatBRL(s.max)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {full && (
          <p className={styles.hint}>
            {MAX_HIGHLIGHTED} stores highlighted. Remove one to pick another.
          </p>
        )}
      </section>
    </div>
  );
};
