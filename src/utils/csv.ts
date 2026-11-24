import type { PriceRow } from 'services/prices';

type CsvValue = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

/**
 * Brazilian Excel opens a file correctly when fields are separated by ";" and decimals use a
 * comma, so that is the format written. Text containing ; " or a line break is quoted.
 */
const SEPARATOR = ';';

const cell = (value: CsvValue): string => {
  if (value == null) return '';
  if (typeof value === 'number') return String(value).replace('.', ',');
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = <T>(rows: T[], columns: CsvColumn<T>[]): string =>
  [
    columns.map((c) => cell(c.header)).join(SEPARATOR),
    ...rows.map((row) =>
      columns.map((c) => cell(c.value(row))).join(SEPARATOR),
    ),
  ].join('\r\n');

/** One line per store and SKU observation, with the dataset's own column names. */
export const PRICE_COLUMNS: CsvColumn<PriceRow>[] = [
  { header: 'ean', value: (r) => r.ean },
  { header: 'desc_sku', value: (r) => r.descSku },
  { header: 'store', value: (r) => r.store },
  { header: 'status', value: (r) => r.status },
  { header: 'price_brl', value: (r) => r.price },
  { header: 'list_price', value: (r) => r.listPrice },
  { header: 'available', value: (r) => r.available },
  { header: 'seller', value: (r) => r.seller },
  { header: 'seller_type', value: (r) => r.sellerType },
  { header: 'found_name', value: (r) => r.foundName },
  { header: 'message', value: (r) => r.message },
  { header: 'url', value: (r) => r.url },
  { header: 'fetched_at_brt', value: (r) => r.fetchedAtBrt },
  { header: 'run_id', value: (r) => r.runId },
];

/** Saves text as a file from the browser. The BOM makes Excel read accents as UTF-8. */
export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
