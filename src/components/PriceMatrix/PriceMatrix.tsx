import { ExportButton } from 'components/ExportButton/ExportButton';
import { ProductThumb } from 'components/ProductThumb/ProductThumb';
import { type FC, type ReactNode, useMemo, useState } from 'react';
import type { PriceRow } from 'services/prices';
import { discount, formatAmount, formatPct, formatPremium } from 'utils/format';
import {
  cellPremium,
  isPartner,
  type Matrix,
  premiumStep,
  reasonLabel,
} from 'utils/insights';
import { pageUrl } from 'utils/links';
import { matchesSku } from 'utils/search';

import styles from './PriceMatrix.module.scss';

const STEP_CLASS = [
  styles.step0,
  styles.step1,
  styles.step2,
  styles.step3,
  styles.step4,
];

const LEGEND_STEPS = [
  [styles.step1, '≤5%'],
  [styles.step2, '≤15%'],
  [styles.step3, '≤30%'],
  [styles.step4, '>30%'],
] as const;

const tooltip = (row: PriceRow) =>
  [
    row.foundName,
    isPartner(row) && `Sold by a partner: ${row.seller || 'unnamed seller'}`,
    row.message,
  ]
    .filter(Boolean)
    .join('\n');

/** Links the content to the store's own product page, so a price can be checked at its source. */
const StoreLink: FC<{ row: PriceRow; children: ReactNode }> = ({
  row,
  children,
}) => {
  const href = pageUrl(row.url);
  if (!href) return <>{children}</>;
  return (
    <a
      className={styles.link}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${row.store}: ${typeof children === 'string' ? children : ''} (opens the store page)`}
    >
      {children}
    </a>
  );
};

const Cell: FC<{ row: PriceRow | undefined; min: number | null }> = ({
  row,
  min,
}) => {
  if (!row) return <td className={`${styles.cell} ${styles.missing}`}>—</td>;
  // A partner's price is not the store's price: the matrix only says the store has no offer of
  // its own. The partner and its price are listed in the price history tab.
  if (isPartner(row)) {
    return (
      <td className={`${styles.cell} ${styles.missing}`} title={tooltip(row)}>
        <StoreLink row={row}>Partner only</StoreLink>
      </td>
    );
  }
  if (row.status !== 'Success' || row.price == null) {
    return (
      <td className={`${styles.cell} ${styles.missing}`} title={tooltip(row)}>
        <StoreLink row={row}>{reasonLabel(row)}</StoreLink>
      </td>
    );
  }
  const off = discount(row.price, row.listPrice);
  const premium = cellPremium(row, min);
  const step = premiumStep(premium);
  const blocked = row.available === false;
  const classes = [
    styles.cell,
    step != null ? STEP_CLASS[step] : '',
    blocked ? styles.notPurchasable : '',
  ].join(' ');
  return (
    <td className={classes} title={tooltip(row)} data-step={step ?? undefined}>
      <div>
        {blocked && (
          <span className={styles.warnIcon} aria-label="not purchasable">
            !
          </span>
        )}
        <span className={styles.price}>
          <StoreLink row={row}>{formatAmount(row.price)}</StoreLink>
        </span>
        {off != null && <span className={styles.promo}>−{formatPct(off)}</span>}
      </div>
      <div className={styles.sub}>
        {blocked
          ? 'not purchasable'
          : step === 0
            ? '▼ Lowest'
            : premium != null
              ? formatPremium(premium)
              : ''}
      </div>
    </td>
  );
};

export type MatrixSort = 'name' | 'spread';

export interface PriceMatrixProps {
  matrix: Matrix;
  /** Store column order (e.g. cheapest store first); stores not listed follow alphabetically. */
  storeOrder?: string[];
  /** Called with an EAN when the SKU name is clicked (e.g. to open its history). */
  onSelectSku?: (ean: string) => void;
}

export const PriceMatrix: FC<PriceMatrixProps> = ({
  matrix,
  storeOrder = [],
  onSelectSku,
}) => {
  const [search, setSearch] = useState('');
  const [onlyPriced, setOnlyPriced] = useState(true);
  const [sort, setSort] = useState<MatrixSort>('name');

  const stores = useMemo(() => {
    const ordered = storeOrder.filter((s) => matrix.stores.includes(s));
    return [...ordered, ...matrix.stores.filter((s) => !ordered.includes(s))];
  }, [matrix.stores, storeOrder]);

  const rows = useMemo(() => {
    const kept = matrix.rows.filter(
      (r) => matchesSku(r, search) && (!onlyPriced || r.min != null),
    );
    return sort === 'spread'
      ? [...kept].sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1))
      : kept;
  }, [matrix.rows, search, onlyPriced, sort]);

  // what is on screen, one line per store and SKU
  const exportRows = useMemo(
    () => rows.flatMap((r) => stores.flatMap((store) => r.cells[store] ?? [])),
    [rows, stores],
  );
  const exportName = `price-matrix-${exportRows[0]?.runId || 'latest'}`;

  const maxSpread = Math.max(0, ...rows.map((r) => r.spread ?? 0));

  return (
    <div className={styles.PriceMatrix}>
      <div className={styles.card}>
        <div className={styles.controls}>
          <input
            type="search"
            aria-label="Search SKU"
            placeholder="Search by name or EAN, e.g. total 90g"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label>
            Sort
            <select
              aria-label="Sort SKUs"
              value={sort}
              onChange={(e) => setSort(e.target.value as MatrixSort)}
            >
              <option value="name">By name</option>
              <option value="spread">Biggest price gap first</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={onlyPriced}
              onChange={(e) => setOnlyPriced(e.target.checked)}
            />
            Hide SKUs without any price
          </label>
          <span className={styles.count}>
            {rows.length} of {matrix.rows.length} SKUs
          </span>
          <ExportButton rows={exportRows} filename={exportName} />
        </div>

        <div className={styles.scroll}>
          <table aria-label="Price matrix">
            <colgroup>
              <col className={styles.colSku} />
              {stores.map((store) => (
                <col key={store} />
              ))}
              <col className={styles.colGap} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.sku}>SKU</th>
                {stores.map((store) => (
                  <th key={store} className={styles.num}>
                    {store}
                  </th>
                ))}
                <th
                  className={styles.num}
                  title="Highest purchasable price vs the lowest"
                >
                  Price gap
                </th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <tr>
                  <td className={styles.none} colSpan={stores.length + 2}>
                    {search.trim()
                      ? `No SKU matches “${search.trim()}”.`
                      : 'No SKU has a price in the latest run.'}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.ean}>
                  <td className={styles.sku}>
                    <div className={styles.skuBody}>
                      <ProductThumb src={r.imageUrl} size={40} zoom />
                      <div>
                        {onSelectSku ? (
                          <button
                            type="button"
                            onClick={() => onSelectSku(r.ean)}
                          >
                            {r.descSku}
                          </button>
                        ) : (
                          r.descSku
                        )}
                        <div className={styles.ean}>{r.ean}</div>
                      </div>
                    </div>
                  </td>
                  {stores.map((store) => (
                    <Cell key={store} row={r.cells[store]} min={r.min} />
                  ))}
                  <td className={styles.num}>
                    <span className={styles.spread}>
                      {formatPremium(r.spread)}
                      <span className={styles.spreadTrack} aria-hidden="true">
                        {r.spread != null && maxSpread > 0 && r.spread > 0 && (
                          <span
                            className={styles.spreadBar}
                            style={{
                              width: `${(r.spread / maxSpread) * 100}%`,
                            }}
                          />
                        )}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.legend}>
          <span
            className={styles.scale}
            aria-label="Premium over the lowest purchasable price"
          >
            Prices in R$ · % above the lowest:
            {LEGEND_STEPS.map(([cls, text]) => (
              <span key={text} className={styles.scaleStep}>
                <span className={`${styles.swatch} ${cls}`} />
                {text}
              </span>
            ))}
          </span>
          <span>
            <span className={styles.promo}>−7%</span> discount vs the
            store&apos;s own list price
          </span>
          <span>
            <span className={styles.warnIcon}>!</span>listed but not purchasable
            (excluded from lowest and gap)
          </span>
          <span>
            Click a price to open that store&apos;s product page · hover a cell
            for the store&apos;s product name
          </span>
        </div>
      </div>
    </div>
  );
};
