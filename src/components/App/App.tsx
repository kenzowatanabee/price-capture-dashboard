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
import { formatAge, formatRunTime, hoursSince } from 'utils/format';
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
  { id: 'overview', label: 'Visão geral' },
  { id: 'products', label: 'Produtos' },
  { id: 'matrix', label: 'Matriz de preços' },
  { id: 'history', label: 'Histórico de preços' },
];

const TAB_COPY: Record<Exclude<Tab, 'overview'>, Headline> = {
  products: {
    title: 'Produtos',
    lede: 'Todos os produtos monitorados: o que são, o menor preço e onde, e em quantas lojas são vendidos.',
  },
  matrix: {
    title: 'Matriz de preços',
    lede: 'O preço mais recente de cada SKU e quanto cada loja está acima da menor oferta disponível para compra.',
  },
  history: {
    title: 'Histórico de preços',
    lede: 'Uma linha por loja, com o último preço coletado em cada dia.',
  },
};

const FALLBACK: Headline = {
  title: 'Preços das lojas, lado a lado.',
  lede: 'Preços diários dos SKUs monitorados nas redes de farmácias brasileiras.',
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
    content = <div className={styles.status}>Carregando a última coleta…</div>;
  } else if (latest.status === 'error') {
    content = (
      <div className={`${styles.status} ${styles.error}`}>
        Não foi possível carregar os preços: {latest.error}
        <button
          type="button"
          className={styles.retry}
          onClick={() => void dispatch(loadLatestRun())}
        >
          Tentar novamente
        </button>
      </div>
    );
  } else if (!latest.rows.length) {
    content = (
      <div className={styles.status}>
        Nenhuma coleta encontrada na base de dados ainda.
      </div>
    );
  } else if (!rows.length) {
    content = (
      <div className={styles.status}>
        Nenhum produto corresponde aos filtros.
      </div>
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
                Última coleta: {formatRunTime(run.fetchedAtBrt)} (Brasília) ·{' '}
                {latest.runId}
              </span>
              {age != null && (
                <span className={styles.fresh}>
                  {age > STALE_AFTER_HOURS ? (
                    <StatusTag
                      kind="warning"
                      label={`Sem nova coleta há ${formatAge(age)}`}
                    />
                  ) : (
                    <StatusTag
                      kind="good"
                      label={`Atualizado há ${formatAge(age)}`}
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
            Filtros de produto indisponíveis: não foi possível carregar a
            segmentação ({segments.error}).
          </p>
        )}
        {content}
      </main>

      <footer className={styles.footer}>
        <span>Price Capture</span>
        <span>Fonte: base PRICE_TRACKER no Domo · preços em R$</span>
      </footer>
    </div>
  );
};
