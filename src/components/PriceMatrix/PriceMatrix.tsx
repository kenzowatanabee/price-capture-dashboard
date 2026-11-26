import { Dropdown } from 'components/Dropdown/Dropdown';
import { ExportButton } from 'components/ExportButton/ExportButton';
import { ExternalLink } from 'components/ExternalLink/ExternalLink';
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
    isPartner(row) &&
      `Vendido por parceiro: ${row.seller || 'vendedor sem nome'}`,
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
    <ExternalLink
      className={styles.link}
      href={href}
      aria-label={`${row.store}: ${typeof children === 'string' ? children : ''} (abre a página da loja)`}
    >
      {children}
    </ExternalLink>
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
        <StoreLink row={row}>Só parceiro</StoreLink>
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
          <span
            className={styles.warnIcon}
            aria-label="indisponível para compra"
          >
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
          ? 'indisponível'
          : step === 0
            ? '▼ Menor'
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
            aria-label="Buscar SKU"
            placeholder="Buscar por nome ou EAN, ex.: total 90g"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className={styles.sort}>
            <Dropdown
              label="Ordenar SKUs"
              value={sort}
              onChange={(next) => setSort(next as MatrixSort)}
              options={[
                { value: 'name', label: 'Ordenar: por nome' },
                {
                  value: 'spread',
                  label: 'Ordenar: maior diferença de preço primeiro',
                },
              ]}
            />
          </div>
          <label>
            <input
              type="checkbox"
              checked={onlyPriced}
              onChange={(e) => setOnlyPriced(e.target.checked)}
            />
            Ocultar SKUs sem preço
          </label>
          <span className={styles.count}>
            {rows.length} de {matrix.rows.length} SKUs
          </span>
          <ExportButton rows={exportRows} filename={exportName} />
        </div>

        <div className={styles.scroll}>
          <table aria-label="Matriz de preços">
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
                  title="Maior preço disponível em relação ao menor"
                >
                  Diferença
                </th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <tr>
                  <td className={styles.none} colSpan={stores.length + 2}>
                    {search.trim()
                      ? `Nenhum SKU corresponde a “${search.trim()}”.`
                      : 'Nenhum SKU tem preço na última coleta.'}
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
            aria-label="Diferença em relação ao menor preço disponível"
          >
            Preços em R$ · % acima do menor:
            {LEGEND_STEPS.map(([cls, text]) => (
              <span key={text} className={styles.scaleStep}>
                <span className={`${styles.swatch} ${cls}`} />
                {text}
              </span>
            ))}
          </span>
          <span>
            <span className={styles.promo}>−7%</span> de desconto sobre o preço
            de tabela da própria loja
          </span>
          <span>
            <span className={styles.warnIcon}>!</span>listado, mas indisponível
            para compra (fora do menor preço e da diferença)
          </span>
          <span>
            Clique em um preço para abrir a página do produto na loja · passe o
            mouse sobre a célula para ver o nome do produto na loja
          </span>
        </div>
      </div>
    </div>
  );
};
