import { StatusTag } from 'components/charts/StatusTag';
import { FilterBar } from 'components/FilterBar/FilterBar';
import { Overview } from 'components/Overview/Overview';
import { PriceHistory } from 'components/PriceHistory/PriceHistory';
import { PriceMatrix } from 'components/PriceMatrix/PriceMatrix';
import { ProductGrid } from 'components/ProductGrid/ProductGrid';
import { type FC, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from 'reducers';
import {
  clearFilters,
  loadHistory,
  loadLatestRun,
  loadSegments,
  selectFilters,
  selectLatest,
  selectSegments,
  selectTab,
  setFilter,
  setTab,
  type Tab,
} from 'reducers/prices/slice';
import { formatAge, hoursSince } from 'utils/format';
import { type Headline, overviewHeadline } from 'utils/headline';
import {
  buildMatrix,
  computeOverview,
  mainRows,
  storeComparison,
} from 'utils/insights';
import { filterEans } from 'utils/segments';

import styles from './App.module.scss';

/** The scraper runs daily; more than this without a new run means something is wrong. */
const STALE_AFTER_HOURS = 30;

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'matrix', label: 'Price matrix' },
  { id: 'history', label: 'Price history' },
];

const TAB_COPY: Record<Exclude<Tab, 'overview'>, Headline> = {
  products: {
    title: 'Products',
    lede: 'Every tracked product: what it is, its lowest price and where, and how widely it is sold.',
  },
  matrix: {
    title: 'Price matrix',
    lede: 'The latest price of each SKU, and how far each store sits above the lowest purchasable offer.',
  },
  history: {
    title: 'Price history',
    lede: 'One line per store, using the last price captured each day.',
  },
};

const FALLBACK: Headline = {
  title: 'Store prices, side by side.',
  lede: 'Daily prices of the tracked SKUs across Brazilian pharmacy chains.',
};

const Logo: FC = () => (
  <svg className={styles.logo} viewBox="0 0 28 28" aria-hidden="true">
    <rect width="28" height="28" rx="8" fill="#ffffff" />
    <path
      d="M7 9.5h6v5h5v4.5h3.5"
      fill="none"
      stroke="#1238c4"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const App: FC = () => {
  const dispatch = useAppDispatch();
  const tab = useAppSelector(selectTab);
  const latest = useAppSelector(selectLatest);

  const segments = useAppSelector(selectSegments);
  const filters = useAppSelector(selectFilters);

  useEffect(() => {
    void dispatch(loadLatestRun());
    void dispatch(loadSegments()); // optional: without it there are simply no filters
  }, [dispatch]);

  // the run as a whole, for the header: when it ran and how fresh it is
  const run = useMemo(
    () => computeOverview(mainRows(latest.rows)),
    [latest.rows],
  );
  const age = run.fetchedAt ? hoursSince(run.fetchedAt) : null;

  // the products the segmentation filters leave
  const eans = useMemo(
    () => [...new Set(latest.rows.map((r) => r.ean))],
    [latest.rows],
  );
  const visible = useMemo(
    () => filterEans(eans, segments.byEan, filters),
    [eans, segments.byEan, filters],
  );
  const rows = useMemo(
    () =>
      visible.size === eans.length
        ? latest.rows
        : latest.rows.filter((r) => visible.has(r.ean)),
    [latest.rows, visible, eans.length],
  );

  // everything that compares or counts uses one row per store and SKU
  const main = useMemo(() => mainRows(rows), [rows]);
  const overview = useMemo(() => computeOverview(main), [main]);
  const matrix = useMemo(() => buildMatrix(main), [main]);
  const comparison = useMemo(() => storeComparison(main), [main]);
  const hasSegments =
    segments.status === 'ready' && Object.keys(segments.byEan).length > 0;

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
  } else if (!rows.length) {
    content = (
      <div className={styles.status}>No product matches the filters.</div>
    );
  } else if (tab === 'overview') {
    content = <Overview overview={overview} comparison={comparison} />;
  } else if (tab === 'products') {
    content = (
      <ProductGrid
        matrix={matrix}
        byEan={segments.byEan}
        onSelectSku={openHistory}
      />
    );
  } else if (tab === 'matrix') {
    content = (
      <PriceMatrix
        matrix={matrix}
        storeOrder={comparison.map((s) => s.store)}
        onSelectSku={openHistory}
      />
    );
  } else {
    content = <PriceHistory latestRows={rows} />;
  }

  const ready = latest.status === 'ready' && latest.rows.length > 0;
  const copy = !ready
    ? FALLBACK
    : tab === 'overview'
      ? overviewHeadline(comparison, overview.skus)
      : TAB_COPY[tab];

  return (
    <div className={styles.App}>
      <header className={styles.hero}>
        <div className={styles.bar}>
          <div className={styles.brand}>
            <Logo />
            Price Capture
          </div>
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
          {ready && (
            <div className={styles.run}>
              <span>
                Latest run: {run.fetchedAtBrt.slice(0, 16) || '—'} (Brasília) ·{' '}
                {latest.runId}
              </span>
              {age != null && (
                <span className={styles.fresh}>
                  {age > STALE_AFTER_HOURS ? (
                    <StatusTag
                      kind="warning"
                      label={`No new run for ${formatAge(age).replace(' ago', '')}`}
                    />
                  ) : (
                    <StatusTag
                      kind="good"
                      label={`Updated ${formatAge(age)}`}
                    />
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={styles.heroBody}>
          <h1>{copy.title}</h1>
          <p className={styles.lede}>{copy.lede}</p>
        </div>
      </header>

      <main>
        {ready && hasSegments && (
          <FilterBar
            eans={eans}
            byEan={segments.byEan}
            filters={filters}
            shown={visible.size}
            onChange={(key, value) => dispatch(setFilter({ key, value }))}
            onClear={() => dispatch(clearFilters())}
          />
        )}
        {ready && segments.status === 'error' && (
          <p className={styles.notice} role="status">
            Product filters are unavailable: the segmentation could not be
            loaded ({segments.error}).
          </p>
        )}
        {content}
      </main>

      <footer className={styles.footer}>
        <span>Price Capture</span>
        <span>Source: PRICE_TRACKER dataset in Domo · prices in BRL</span>
      </footer>
    </div>
  );
};
