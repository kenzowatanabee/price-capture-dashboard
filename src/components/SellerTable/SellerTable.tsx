import { Card } from 'components/charts/StatTile';
import { ExternalLink } from 'components/ExternalLink/ExternalLink';
import { type FC } from 'react';
import type { PriceRow } from 'services/prices';
import { formatBRL } from 'utils/format';
import { isComparable, isPartner, reasonLabel } from 'utils/insights';
import { pageUrl } from 'utils/links';

import styles from './SellerTable.module.scss';

export interface SellerTableProps {
  /** One SKU's rows from the latest run: each store's main row and its other sellers' rows. */
  rows: PriceRow[];
}

const priced = (row: PriceRow) => row.status === 'Success' && row.price != null;

/** The store's own purchasable offers first (cheapest on top), then partners, then no price. */
const rank = (row: PriceRow) =>
  row.mainOffer && isComparable(row) ? 0 : priced(row) ? 1 : 2;

const soldBy = (row: PriceRow): string =>
  row.seller || (row.sellerType === 'store' ? row.store : '—');

const canBuy = (row: PriceRow): string =>
  row.available == null ? '—' : row.available ? 'Sim' : 'Não';

/** Who sells one SKU at each store in the latest run: the store itself or a partner, and at what price. */
export const SellerTable: FC<SellerTableProps> = ({ rows }) => {
  const sorted = [...rows].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.price ?? Infinity) - (b.price ?? Infinity) ||
      a.store.localeCompare(b.store, 'pt-BR') ||
      a.seller.localeCompare(b.seller, 'pt-BR'),
  );
  return (
    <Card
      title="Vendedores na última coleta"
      subtitle="Quem vende este produto no site de cada loja. Ofertas de parceiros aparecem aqui, mas não entram na comparação de preços."
    >
      <div className={styles.wrap}>
        <table aria-label="Vendedores na última coleta">
          <thead>
            <tr>
              <th>Loja</th>
              <th>Vendido por</th>
              <th className={styles.num}>Preço</th>
              <th className={styles.num}>Preço de tabela</th>
              <th>Disponível para compra</th>
              <th>Página da loja</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const href = pageUrl(row.url);
              return (
                <tr
                  key={`${row.store}|${row.sellerId}|${row.seller}|${row.mainOffer}`}
                >
                  <td>{row.store}</td>
                  <td>
                    {soldBy(row)}
                    {isPartner(row) && (
                      <span className={styles.tag}>Parceiro</span>
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
                      <ExternalLink href={href}>Abrir ↗</ExternalLink>
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
