import { PRICES_ALIAS, type QueryFn, type SqlRow, sqlString } from './sql';

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

export const parseNumber = (value?: string | null): number | null => {
  const text = (value ?? '').trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

export const parseAvailable = (value?: string | null): boolean | null => {
  const text = (value ?? '').trim().toLowerCase();
  if (text === 'true') return true;
  if (text === 'false') return false;
  return null;
};

export const reasonCode = (message: string): string | null => {
  const match = /^([A-Z_]+):/.exec(message.trim());
  return match ? match[1] : null;
};

export const toPriceRow = (row: SqlRow): PriceRow => ({
  runId: row.run_id ?? '',
  ean: row.ean ?? '',
  descSku: row.desc_sku ?? '',
  store: row.store ?? '',
  status: row.status ?? '',
  price: parseNumber(row.price_brl),
  listPrice: parseNumber(row.list_price),
  foundName: row.found_name ?? '',
  message: row.message ?? '',
  code: reasonCode(row.message ?? ''),
  available: parseAvailable(row.available),
  seller: row.seller ?? '',
  url: row.url ?? '',
  fetchedAt: row.fetched_at ?? '',
  fetchedAtBrt: row.fetched_at_brt ?? '',
});

const COLUMNS =
  'run_id, ean, desc_sku, store, status, price_brl, list_price, found_name, message, available, seller, url, fetched_at, fetched_at_brt';

/** The run_id of the most recent scraper run (rows from before run_id existed are ignored). */
export const fetchLatestRunId = async (
  query: QueryFn,
): Promise<string | null> => {
  const rows = await query(
    `SELECT run_id, MAX(fetched_at) AS last_fetch FROM ${PRICES_ALIAS} ` +
      `WHERE run_id IS NOT NULL AND run_id <> '' ` +
      `GROUP BY run_id ORDER BY last_fetch DESC LIMIT 1`,
  );
  return rows[0]?.run_id || null;
};

/** Every row of one scraper run. */
export const fetchRun = async (
  query: QueryFn,
  runId: string,
): Promise<PriceRow[]> =>
  (
    await query(
      `SELECT ${COLUMNS} FROM ${PRICES_ALIAS} WHERE run_id = ${sqlString(runId)}`,
    )
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
    await query(
      `SELECT ${COLUMNS} FROM ${PRICES_ALIAS} WHERE ean = ${sqlString(ean)} ORDER BY fetched_at`,
    )
  ).map(toPriceRow);
};
