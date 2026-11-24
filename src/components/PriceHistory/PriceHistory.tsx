import { ExportButton } from 'components/ExportButton/ExportButton';
import { ProductThumb } from 'components/ProductThumb/ProductThumb';
import { SellerTable } from 'components/SellerTable/SellerTable';
import { SkuPicker } from 'components/SkuPicker/SkuPicker';
import { type FC, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'reducers';
import { loadHistory, selectHistory } from 'reducers/prices/slice';
import type { PriceRow } from 'services/prices';
import { defaultSlots, type SlotMap, toggleHighlight } from 'utils/colors';
import { formatBRL } from 'utils/format';
import { buildHistory, buildMatrix, isComparable } from 'utils/insights';

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

  // one entry per SKU of the latest run, with its picture and its lowest price
  const skus = useMemo(() => buildMatrix(latestRows).rows, [latestRows]);

  const selected = history.ean ?? initialEan ?? skus[0]?.ean ?? null;

  useEffect(() => {
    if (selected && history.ean !== selected) {
      void dispatch(loadHistory(selected));
    }
  }, [dispatch, selected, history.ean]);

  const product = skus.find((s) => s.ean === selected);
  const offers = product
    ? Object.values(product.cells).filter((r) => r != null)
    : [];
  const buyable = offers.filter(isComparable);
  const lowestStore = product?.cheapest[0];
  const link = lowestStore ? product.cells[lowestStore]?.url : '';

  const series = useMemo(() => buildHistory(history.rows), [history.rows]);

  // highlight the cheapest stores of the latest day; a new SKU starts from its own cheapest
  const [slots, setSlots] = useState<SlotMap>({});
  useEffect(() => setSlots(defaultSlots(series)), [series]);

  if (!skus.length) {
    return <div className={styles.status}>No SKUs in the latest run.</div>;
  }

  return (
    <div className={styles.PriceHistory}>
      <section className={styles.product} aria-label="Product">
        <ProductThumb src={product?.imageUrl} size={88} zoom />
        <div className={styles.info}>
          <h2>{product?.descSku ?? 'Unknown product'}</h2>
          <p className={styles.ean}>EAN {selected}</p>
          {product && (
            <p className={styles.facts}>
              {product.min != null ? (
                <>
                  Lowest in the latest run:{' '}
                  <strong>{formatBRL(product.min)}</strong> at{' '}
                  {product.cheapest.join(', ')}
                </>
              ) : (
                'No purchasable price in the latest run'
              )}
              <span>
                Sold and purchasable at {buyable.length} of {offers.length}{' '}
                stores
              </span>
              {link && /^https?:\/\//i.test(link) && (
                <a href={link} target="_blank" rel="noreferrer">
                  Open at {lowestStore} ↗
                </a>
              )}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <SkuPicker
            skus={skus}
            selected={selected}
            onSelect={(ean) => void dispatch(loadHistory(ean))}
          />
          <ExportButton
            rows={history.status === 'ready' ? history.rows : []}
            filename={`price-history-${selected}`}
            label="Export this product's history"
          />
        </div>
      </section>

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

      {offers.length > 0 && <SellerTable rows={offers} />}
    </div>
  );
};
