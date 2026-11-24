import { type FC, useMemo, useState } from 'react';
import type { PriceRow } from 'services/prices';
import { discount, formatBRL, formatPct, formatPremium } from 'utils/format';
import {
  cellPremium,
  type Matrix,
  type MatrixRow,
  premiumStep,
  reasonLabel,
} from 'utils/insights';

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
  [row.foundName, row.message].filter(Boolean).join('\n');

const Cell: FC<{ row: PriceRow | undefined; min: number | null }> = ({
  row,
  min,
}) => {
  if (!row) return <td className={`${styles.cell} ${styles.missing}`}>—</td>;
  if (row.status !== 'Success' || row.price == null) {
    return (
      <td className={`${styles.cell} ${styles.missing}`} title={tooltip(row)}>
        {reasonLabel(row)}
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
        <span className={styles.price}>{formatBRL(row.price)}</span>
        {off != null && <span className={styles.promo}>−{formatPct(off)}</span>}
      </div>
      <div className={styles.sub}>
        {blocked
          ? 'not purchasable'
          : step === 0
            ? '▼ Lowest'
            : premium != null
              ? `${formatPremium(premium)} vs lowest`
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

const matches = (row: MatrixRow, text: string) =>
  !text || row.descSku.toLowerCase().includes(text) || row.ean.includes(text);

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
    const text = search.trim().toLowerCase();
    const kept = matrix.rows.filter(
      (r) => matches(r, text) && (!onlyPriced || r.min != null),
    );
    return sort === 'spread'
      ? [...kept].sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1))
      : kept;
  }, [matrix.rows, search, onlyPriced, sort]);

  const maxSpread = Math.max(0, ...rows.map((r) => r.spread ?? 0));

  return (
    <div className={styles.PriceMatrix}>
      <div className={styles.card}>
        <div className={styles.controls}>
          <input
            type="search"
            aria-label="Search SKU"
            placeholder="Search by description or EAN"
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
        </div>

        <div className={styles.scroll}>
          <table aria-label="Price matrix">
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
              {rows.map((r) => (
                <tr key={r.ean}>
                  <td className={styles.sku}>
                    {onSelectSku ? (
                      <button type="button" onClick={() => onSelectSku(r.ean)}>
                        {r.descSku}
                      </button>
                    ) : (
                      r.descSku
                    )}
                    <div className={styles.ean}>{r.ean}</div>
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
            Above the lowest:
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
            Hover a cell for the store&apos;s product name and details
          </span>
        </div>
      </div>
    </div>
  );
};
