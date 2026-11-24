import { Card } from 'components/charts/StatTile';
import { type FC } from 'react';
import type { PriceRow } from 'services/prices';
import { formatBRL } from 'utils/format';
import { isComparable, isPartner, reasonLabel } from 'utils/insights';
import { pageUrl } from 'utils/links';

import styles from './SellerTable.module.scss';

export interface SellerTableProps {
  /** One SKU's rows from the latest run, one per store. */
  rows: PriceRow[];
}

const priced = (row: PriceRow) => row.status === 'Success' && row.price != null;

/** The store's own purchasable offers first (cheapest on top), then partners, then no price. */
const rank = (row: PriceRow) => (isComparable(row) ? 0 : priced(row) ? 1 : 2);

const soldBy = (row: PriceRow): string =>
  row.seller || (row.sellerType === 'store' ? row.store : '—');

const canBuy = (row: PriceRow): string =>
  row.available == null ? '—' : row.available ? 'Yes' : 'No';

/** Who sells one SKU at each store in the latest run: the store itself or a partner, and at what price. */
export const SellerTable: FC<SellerTableProps> = ({ rows }) => {
  const sorted = [...rows].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.price ?? Infinity) - (b.price ?? Infinity) ||
      a.store.localeCompare(b.store, 'pt-BR'),
  );
  return (
    <Card
      title="Sellers in the latest run"
      subtitle="Who sells this product on each store's site. Partner offers are listed here but are not part of the price comparison."
    >
      <div className={styles.wrap}>
        <table aria-label="Sellers in the latest run">
          <thead>
            <tr>
              <th>Store</th>
              <th>Sold by</th>
              <th className={styles.num}>Price</th>
              <th className={styles.num}>List price</th>
              <th>Can be bought</th>
              <th>Store page</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const href = pageUrl(row.url);
              return (
                <tr key={row.store}>
                  <td>{row.store}</td>
                  <td>
                    {soldBy(row)}
                    {isPartner(row) && (
                      <span className={styles.tag}>Partner</span>
                    )}
                  </td>
                  <td className={styles.num}>
                    {priced(row) ? (
                      formatBRL(row.price)
                    ) : (
                      <span className={styles.muted}>{reasonLabel(row)}</span>
                    )}
                  </td>
                  <td className={styles.num}>
                    {priced(row) ? formatBRL(row.listPrice) : '—'}
                  </td>
                  <td>{priced(row) ? canBuy(row) : '—'}</td>
                  <td>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer">
                        Open ↗
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
