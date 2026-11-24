import { type FC, lazy, Suspense, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from 'reducers';
import { loadHistory, selectHistory } from 'reducers/prices/slice';
import type { PriceRow } from 'services/prices';
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

  if (!skus.length) {
    return <div className={styles.status}>No SKUs in the latest run.</div>;
  }

  return (
    <div className={styles.PriceHistory}>
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
          <HistoryChart series={series} />
        </Suspense>
      )}
    </div>
  );
};
