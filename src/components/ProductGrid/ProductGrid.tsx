import { ProductThumb } from 'components/ProductThumb/ProductThumb';
import { type FC, useMemo, useState } from 'react';
import type { ProductSegments } from 'services/segments';
import { formatBRL, formatPremium } from 'utils/format';
import { isComparable, type Matrix, type MatrixRow } from 'utils/insights';
import { matchesSku } from 'utils/search';

import styles from './ProductGrid.module.scss';

export type ProductSort = 'name' | 'price' | 'gap' | 'stores';

export interface ProductGridProps {
  matrix: Matrix;
  byEan: Record<string, ProductSegments>;
  /** Called with an EAN when a product is opened. */
  onSelectSku?: (ean: string) => void;
}

/** Stores where the product can be bought from the store itself. */
const buyableAt = (row: MatrixRow): number =>
  Object.values(row.cells).filter((r) => r != null && isComparable(r)).length;

const SORTS: Record<ProductSort, (a: MatrixRow, b: MatrixRow) => number> = {
  name: () => 0, // the matrix is already in name order
  price: (a, b) => (a.min ?? Infinity) - (b.min ?? Infinity),
  gap: (a, b) => (b.spread ?? -1) - (a.spread ?? -1),
  stores: (a, b) => buyableAt(a) - buyableAt(b),
};

/** What the product is, in its segmentation's own words (blank fields are skipped). */
const tags = (product: ProductSegments | undefined): string[] =>
  product
    ? [product.brand, product.subBrand, product.segment, product.subsegment]
        .filter(Boolean)
        .filter((value, i, all) => all.indexOf(value) === i)
    : [];

/** One card per product: what it is, its lowest price and where, how widely it is sold. */
export const ProductGrid: FC<ProductGridProps> = ({
  matrix,
  byEan,
  onSelectSku,
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ProductSort>('name');

  const rows = useMemo(
    () =>
      [...matrix.rows.filter((r) => matchesSku(r, search))].sort(SORTS[sort]),
    [matrix.rows, search, sort],
  );
  const storeCount = matrix.stores.length;

  return (
    <div className={styles.ProductGrid}>
      <div className={styles.controls}>
        <input
          type="search"
          aria-label="Search products"
          placeholder="Search by name or EAN, e.g. total 90g"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label>
          Sort
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value as ProductSort)}
          >
            <option value="name">By name</option>
            <option value="price">Lowest price first</option>
            <option value="gap">Biggest price gap first</option>
            <option value="stores">Sold at fewest stores first</option>
          </select>
        </label>
        <span className={styles.count}>
          {rows.length} of {matrix.rows.length} products
        </span>
      </div>

      {!rows.length && (
        <p className={styles.none}>
          {search.trim()
            ? `No product matches “${search.trim()}”.`
            : 'No product matches the filters.'}
        </p>
      )}

      <ul className={styles.grid} aria-label="Products">
        {rows.map((r) => {
          const product = byEan[r.ean];
          const stores = buyableAt(r);
          const Body = onSelectSku ? 'button' : 'div';
          return (
            <li key={r.ean}>
              <Body
                className={styles.card}
                {...(onSelectSku
                  ? { type: 'button', onClick: () => onSelectSku(r.ean) }
                  : {})}
              >
                <ProductThumb src={r.imageUrl} size={72} />
                <span className={styles.body}>
                  <span className={styles.name}>{r.descSku}</span>
                  <span className={styles.ean}>
                    {r.ean}
                    {product?.category ? ` · ${product.category}` : ''}
                  </span>
                  {tags(product).length > 0 && (
                    <span className={styles.tags}>
                      {tags(product).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </span>
                  )}
                  <span className={styles.facts}>
                    {r.min != null ? (
                      <span>
                        <strong>{formatBRL(r.min)}</strong> at {r.cheapest[0]}
                        {r.cheapest.length > 1
                          ? ` +${r.cheapest.length - 1}`
                          : ''}
                      </span>
                    ) : (
                      <span>No purchasable price</span>
                    )}
                    <span>
                      {stores} of {storeCount} stores
                    </span>
                    {r.spread != null && r.spread > 0 && (
                      <span>gap {formatPremium(r.spread)}</span>
                    )}
                  </span>
                </span>
              </Body>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
