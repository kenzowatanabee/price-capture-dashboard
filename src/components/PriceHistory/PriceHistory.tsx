import { type FC, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'reducers';
import { loadHistory, selectHistory } from 'reducers/prices/slice';
import type { PriceRow } from 'services/prices';
import { defaultSlots, type SlotMap, toggleHighlight } from 'utils/colors';
import { buildHistory } from 'utils/insights';

import styles from './PriceHistory.module.scss';

// Recharts is most of the bundle and only this tab needs it: load it on demand.
const HistoryChart = lazy(() =>
  import('components/HistoryChart/HistoryChart').then((m) => ({
    default: m.HistoryChart,
  })),
);

export interface PriceHistoryProps {
  /** Rows of the latest run, used to list the SKUs. */
  latestRows: PriceRow[];
  /** EAN to show first (e.g. clicked in the matrix). */
  initialEan?: string | null;
}

export const PriceHistory: FC<PriceHistoryProps> = ({
  latestRows,
  initialEan,
}) => {
  const dispatch = useAppDispatch();
  const history = useAppSelector(selectHistory);

  const skus = useMemo(() => {
    const unique = new Map(latestRows.map((r) => [r.ean, r.descSku]));
    return [...unique.entries()]
      .map(([ean, descSku]) => ({ ean, descSku }))
      .sort((a, b) => a.descSku.localeCompare(b.descSku, 'pt-BR'));
  }, [latestRows]);

  const selected = history.ean ?? initialEan ?? skus[0]?.ean ?? null;

  useEffect(() => {
    if (selected && history.ean !== selected) {
      void dispatch(loadHistory(selected));
    }
  }, [dispatch, selected, history.ean]);

  const series = useMemo(() => buildHistory(history.rows), [history.rows]);

  // highlight the cheapest stores of the latest day; a new SKU starts from its own cheapest
  const [slots, setSlots] = useState<SlotMap>({});
  useEffect(() => setSlots(defaultSlots(series)), [series]);

  if (!skus.length) {
    return <div className={styles.status}>No SKUs in the latest run.</div>;
  }

  return (
    <div className={styles.PriceHistory}>
      <div className={styles.toolbar}>
        <span aria-hidden="true">SKU</span>
        <select
          aria-label="SKU"
          value={selected ?? ''}
          onChange={(e) => void dispatch(loadHistory(e.target.value))}
        >
          {skus.map((s) => (
            <option key={s.ean} value={s.ean}>
              {s.descSku} — {s.ean}
            </option>
          ))}
        </select>
      </div>

      {history.status === 'loading' && (
        <div className={styles.status}>Loading history…</div>
      )}
      {history.status === 'error' && (
        <div className={`${styles.status} ${styles.error}`}>
          Could not load the history: {history.error}
        </div>
      )}
      {history.status === 'ready' && (
        <Suspense
          fallback={<div className={styles.status}>Loading chart…</div>}
        >
          <HistoryChart
            series={series}
            slots={slots}
            onToggle={(store) =>
              setSlots((current) => toggleHighlight(current, store))
            }
          />
        </Suspense>
      )}
    </div>
  );
};
