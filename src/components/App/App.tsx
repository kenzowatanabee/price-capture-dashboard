import { Overview } from 'components/Overview/Overview';
import { PriceHistory } from 'components/PriceHistory/PriceHistory';
import { PriceMatrix } from 'components/PriceMatrix/PriceMatrix';
import { type FC, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from 'reducers';
import {
  loadHistory,
  loadLatestRun,
  selectLatest,
  selectTab,
  setTab,
  type Tab,
} from 'reducers/prices/slice';
import { buildMatrix, computeOverview } from 'utils/insights';

import styles from './App.module.scss';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'matrix', label: 'Price matrix' },
  { id: 'history', label: 'Price history' },
];

export const App: FC = () => {
  const dispatch = useAppDispatch();
  const tab = useAppSelector(selectTab);
  const latest = useAppSelector(selectLatest);

  useEffect(() => {
    void dispatch(loadLatestRun());
  }, [dispatch]);

  const overview = useMemo(() => computeOverview(latest.rows), [latest.rows]);
  const matrix = useMemo(() => buildMatrix(latest.rows), [latest.rows]);

  const openHistory = (ean: string) => {
    void dispatch(loadHistory(ean));
    dispatch(setTab('history'));
  };

  let content;
  if (latest.status === 'idle' || latest.status === 'loading') {
    content = <div className={styles.status}>Loading the latest run…</div>;
  } else if (latest.status === 'error') {
    content = (
      <div className={`${styles.status} ${styles.error}`}>
        Could not load prices: {latest.error}
        <button
          type="button"
          className={styles.retry}
          onClick={() => void dispatch(loadLatestRun())}
        >
          Retry
        </button>
      </div>
    );
  } else if (!latest.rows.length) {
    content = (
      <div className={styles.status}>
        No scraper run with a run id found in the dataset yet.
      </div>
    );
  } else if (tab === 'overview') {
    content = <Overview overview={overview} />;
  } else if (tab === 'matrix') {
    content = <PriceMatrix matrix={matrix} onSelectSku={openHistory} />;
  } else {
    content = <PriceHistory latestRows={latest.rows} />;
  }

  return (
    <div className={styles.App}>
      <header className={styles.header}>
        <h1>Price Capture</h1>
        {latest.status === 'ready' && latest.rows.length > 0 && (
          <span className={styles.run}>
            Latest run: {overview.fetchedAtBrt || '—'} (Brasília) ·{' '}
            {latest.runId}
          </span>
        )}
      </header>

      <nav className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => dispatch(setTab(t.id))}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>{content}</main>
    </div>
  );
};
