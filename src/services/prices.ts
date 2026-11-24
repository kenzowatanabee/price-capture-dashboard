import type { DataRow, DataValue, QueryFn } from './domo';

/** One row of the PRICE_TRACKER dataset (one store x one SKU in one scraper run). */
export interface PriceRow {
  runId: string;
  ean: string;
  descSku: string;
  store: string;
  /** Success | Not Found | Error */
  status: string;
  /** Selling price ("por"), only on Success rows. */
  price: number | null;
  /** The store's reference price ("de"), when it shows one. */
  listPrice: number | null;
  foundName: string;
  message: string;
  /** Reason code at the start of `message` ("NOT_LISTED: ..." -> "NOT_LISTED"). */
  code: string | null;
  /** VTEX stores: can it be bought for delivery to the reference CEP. Null when unknown. */
  available: boolean | null;
  seller: string;
  url: string;
  /** UTC timestamp (Domo converts it to the company time zone for display). */
  fetchedAt: string;
  /** Brasilia clock time, as text. */
  fetchedAtBrt: string;
}

const text = (value: DataValue | undefined): string =>
  value == null ? '' : String(value);

export const parseNumber = (value?: DataValue): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = (value ?? '').trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

export const parseAvailable = (value?: DataValue): boolean | null => {
  const flag = text(value).trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return null;
};

export const reasonCode = (message: string): string | null => {
  const match = /^([A-Z_]+):/.exec(message.trim());
  return match ? match[1] : null;
};

export const toPriceRow = (row: DataRow): PriceRow => ({
  runId: text(row.run_id),
  ean: text(row.ean),
  descSku: text(row.desc_sku),
  store: text(row.store),
  status: text(row.status),
  price: parseNumber(row.price_brl),
  listPrice: parseNumber(row.list_price),
  foundName: text(row.found_name),
  message: text(row.message),
  code: reasonCode(text(row.message)),
  available: parseAvailable(row.available),
  seller: text(row.seller),
  url: text(row.url),
  fetchedAt: text(row.fetched_at),
  fetchedAtBrt: text(row.fetched_at_brt),
});

const COLUMNS = [
  'run_id',
  'ean',
  'desc_sku',
  'store',
  'status',
  'price_brl',
  'list_price',
  'found_name',
  'message',
  'available',
  'seller',
  'url',
  'fetched_at',
  'fetched_at_brt',
];

/** The run_id of the most recent scraper run (the newest row's run). */
export const fetchLatestRunId = async (
  query: QueryFn,
): Promise<string | null> => {
  const rows = await query({
    select: ['run_id', 'fetched_at'],
    orderBy: { column: 'fetched_at', direction: 'descending' },
    limit: 1,
  });
  return text(rows[0]?.run_id) || null;
};

/** Every row of one scraper run. */
export const fetchRun = async (
  query: QueryFn,
  runId: string,
): Promise<PriceRow[]> =>
  (
    await query({
      select: COLUMNS,
      where: [{ column: 'run_id', equals: runId }],
    })
  ).map(toPriceRow);

/** Every row ever recorded for one EAN, oldest first. */
export const fetchHistory = async (
  query: QueryFn,
  ean: string,
): Promise<PriceRow[]> => {
  if (!/^\d{8,14}$/.test(ean)) {
    throw new Error(`Invalid EAN: ${ean}`);
  }
  return (
    await query({
      select: COLUMNS,
      where: [{ column: 'ean', equals: ean }],
      orderBy: { column: 'fetched_at', direction: 'ascending' },
    })
  ).map(toPriceRow);
};
