import { StatusTag } from 'components/charts/StatusTag';
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
import { formatAge, hoursSince } from 'utils/format';
import { type Headline, overviewHeadline } from 'utils/headline';
import { buildMatrix, computeOverview, storeComparison } from 'utils/insights';

import styles from './App.module.scss';

/** The scraper runs daily; more than this without a new run means something is wrong. */
const STALE_AFTER_HOURS = 30;

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'matrix', label: 'Price matrix' },
  { id: 'history', label: 'Price history' },
];

const TAB_COPY: Record<Exclude<Tab, 'overview'>, Headline> = {
  matrix: {
    title: 'Every SKU, at every store.',
    lede: 'The latest price of each SKU, and how far each store sits above the lowest purchasable offer.',
  },
  history: {
    title: 'How prices moved.',
    lede: 'One line per store, using the last price captured each day.',
  },
};

const FALLBACK: Headline = {
  title: 'Store prices, side by side.',
  lede: 'Daily prices of the tracked SKUs across Brazilian pharmacy chains.',
};

/** Decorative hills behind the header; carries no data. */
const HeroArt: FC = () => (
  <div className={styles.art} aria-hidden="true">
    <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
      <path
        className={styles.hillBack}
        d="M0,210 C220,120 430,140 650,196 C870,252 1060,104 1440,160 L1440,320 L0,320 Z"
      />
      <path
        className={styles.hillFront}
        d="M0,286 C300,206 520,300 800,252 C1040,210 1240,256 1440,214 L1440,320 L0,320 Z"
      />
    </svg>
  </div>
);

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

  useEffect(() => {
    void dispatch(loadLatestRun());
  }, [dispatch]);

  const overview = useMemo(() => computeOverview(latest.rows), [latest.rows]);
  const matrix = useMemo(() => buildMatrix(latest.rows), [latest.rows]);
  const comparison = useMemo(() => storeComparison(latest.rows), [latest.rows]);
  const age = overview.fetchedAt ? hoursSince(overview.fetchedAt) : null;

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
    content = <Overview overview={overview} comparison={comparison} />;
  } else if (tab === 'matrix') {
    content = (
      <PriceMatrix
        matrix={matrix}
        storeOrder={comparison.map((s) => s.store)}
        onSelectSku={openHistory}
      />
    );
  } else {
    content = <PriceHistory latestRows={latest.rows} />;
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
        <HeroArt />
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
          {ready && age != null && (
            <div className={styles.fresh}>
              {age > STALE_AFTER_HOURS ? (
                <StatusTag
                  kind="warning"
                  label={`No new run for ${formatAge(age).replace(' ago', '')}`}
                />
              ) : (
                <StatusTag kind="good" label={`Updated ${formatAge(age)}`} />
              )}
            </div>
          )}
        </div>

        <div className={styles.heroBody}>
          {ready && (
            <p className={styles.eyebrow}>
              Latest run: {overview.fetchedAtBrt.slice(0, 16) || '—'} (Brasília)
              · {latest.runId}
            </p>
          )}
          <h1>{copy.title}</h1>
          <p className={styles.lede}>{copy.lede}</p>
        </div>
      </header>

      <main>{content}</main>

      <footer className={styles.footer}>
        <span>Price Capture</span>
        <span>Source: PRICE_TRACKER dataset in Domo · prices in BRL</span>
      </footer>
    </div>
  );
};
