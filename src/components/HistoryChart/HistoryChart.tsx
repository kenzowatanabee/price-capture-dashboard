import { ExternalLink } from 'components/ExternalLink/ExternalLink';
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
import { formatAmount, formatBRL, shortDate } from 'utils/format';
import type { HistoryPoint, HistorySeries } from 'utils/insights';
import { pageUrl } from 'utils/links';

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
      <div className={styles.empty}>
        Nenhum preço registrado para este SKU ainda.
      </div>
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
      <section className={styles.card} aria-label="Preço ao longo do tempo">
        <div className={styles.cardTop}>
          <div>
            <h2>Preço ao longo do tempo</h2>
            <p>
              Último preço de cada dia · lojas em destaque em cor, as demais em
              cinza
            </p>
          </div>
          <div className={styles.views} role="group" aria-label="Visualização">
            <button
              type="button"
              aria-pressed={view === 'chart'}
              onClick={() => setView('chart')}
            >
              Gráfico
            </button>
            <button
              type="button"
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
            >
              Tabela
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
            <table aria-label="Tabela do histórico de preços">
              <thead>
                <tr>
                  <th>Data</th>
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

      <section className={styles.card} aria-label="Lojas">
        <div className={styles.cardTop}>
          <div>
            <h2>Lojas</h2>
            <p>
              Preços em R$ · mais barata primeiro · clique para destacar (até{' '}
              {MAX_HIGHLIGHTED})
            </p>
          </div>
        </div>
        <div className={styles.headRow} aria-hidden="true">
          <div className={styles.storeHead}>
            <span />
            <span>Loja</span>
            <span className={styles.num}>Atual</span>
            <span className={styles.num}>Menor</span>
            <span className={styles.num}>Maior</span>
          </div>
          <span className={styles.open} />
        </div>
        <ul className={styles.stores} aria-label="Resumo de preços">
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
                      ? `Até ${MAX_HIGHLIGHTED} lojas podem ser destacadas`
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
                  <span className={styles.num}>{formatAmount(s.latest)}</span>
                  <span className={styles.num}>{formatAmount(s.min)}</span>
                  <span className={styles.num}>{formatAmount(s.max)}</span>
                </button>
                {pageUrl(s.url) ? (
                  <ExternalLink
                    className={styles.open}
                    href={pageUrl(s.url)!}
                    aria-label={`Abrir a página do produto em ${s.store}`}
                    title={`Abrir a página do produto em ${s.store}`}
                  >
                    ↗
                  </ExternalLink>
                ) : (
                  <span className={styles.open} />
                )}
              </li>
            );
          })}
        </ul>
        {full && (
          <p className={styles.hint}>
            {MAX_HIGHLIGHTED} lojas em destaque. Remova uma para escolher outra.
          </p>
        )}
      </section>
    </div>
  );
};
