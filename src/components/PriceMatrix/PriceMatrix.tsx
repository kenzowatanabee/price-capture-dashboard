import { type FC, useMemo, useState } from 'react';
import type { PriceRow } from 'services/prices';
import { discount, formatBRL, formatPct } from 'utils/format';
import type { Matrix, MatrixRow } from 'utils/insights';

import styles from './PriceMatrix.module.scss';

const tooltip = (row: PriceRow) =>
  [row.foundName, row.message].filter(Boolean).join('\n');

const Cell: FC<{ row: PriceRow | undefined; cheapest: boolean }> = ({
  row,
  cheapest,
}) => {
  if (!row) return <td className={styles.missing}>—</td>;
  if (row.status !== 'Success' || row.price == null) {
    return (
      <td className={`${styles.cell} ${styles.missing}`} title={tooltip(row)}>
        {row.code ?? row.status}
      </td>
    );
  }
  const off = discount(row.price, row.listPrice);
  const classes = [
    styles.cell,
    cheapest ? styles.cheapest : '',
    row.available === false ? styles.notPurchasable : '',
  ].join(' ');
  return (
    <td className={classes} title={tooltip(row)}>
      {formatBRL(row.price)}
      {off != null && (
        <span className={`${styles.badge} ${styles.discount}`}>
          −{formatPct(off)}
        </span>
      )}
    </td>
  );
};

export interface PriceMatrixProps {
  matrix: Matrix;
  /** Called with an EAN when the SKU name is clicked (e.g. to open its history). */
  onSelectSku?: (ean: string) => void;
}

const matches = (row: MatrixRow, text: string) =>
  !text || row.descSku.toLowerCase().includes(text) || row.ean.includes(text);

export const PriceMatrix: FC<PriceMatrixProps> = ({ matrix, onSelectSku }) => {
  const [search, setSearch] = useState('');
  const [onlyPriced, setOnlyPriced] = useState(true);

  const rows = useMemo(() => {
    const text = search.trim().toLowerCase();
    return matrix.rows.filter(
      (r) => matches(r, text) && (!onlyPriced || r.min != null),
    );
  }, [matrix.rows, search, onlyPriced]);

  return (
    <div className={styles.PriceMatrix}>
      <div className={styles.controls}>
        <input
          type="search"
          aria-label="Search SKU"
          placeholder="Search by description or EAN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={onlyPriced}
            onChange={(e) => setOnlyPriced(e.target.checked)}
          />{' '}
          Hide SKUs without any price
        </label>
        <span className={styles.count}>
          {rows.length} of {matrix.rows.length} SKUs
        </span>
      </div>

      <div className={styles.card}>
        <table aria-label="Price matrix">
          <thead>
            <tr>
              <th>SKU</th>
              {matrix.stores.map((store) => (
                <th key={store} className={styles.cell}>
                  {store}
                </th>
              ))}
              <th className={styles.cell}>Spread</th>
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
                {matrix.stores.map((store) => (
                  <Cell
                    key={store}
                    row={r.cells[store]}
                    cheapest={r.cheapest.includes(store)}
                  />
                ))}
                <td className={styles.cell}>{formatPct(r.spread)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <span className={styles.cheapest}>Cheapest store</span>
        <span>
          <span className={`${styles.badge} ${styles.discount}`}>−7%</span>{' '}
          discount vs the store&apos;s own list price
        </span>
        <span className={styles.notPurchasable}>Not purchasable</span>
        <span>
          Codes (e.g. NOT_LISTED) when there is no price · hover for details
        </span>
      </div>
    </div>
  );
};
