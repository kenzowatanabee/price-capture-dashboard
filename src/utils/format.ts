const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatBRL = (value: number | null | undefined): string =>
  value == null ? '—' : brl.format(value);

const amount = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** A price without the currency symbol ("21,99"), for dense tables that state the currency once. */
export const formatAmount = (value: number | null | undefined): string =>
  value == null ? '—' : amount.format(value);

/** A number with a fixed count of decimals, written the Brazilian way (decimal comma). */
const decimal = (value: number, digits: number): string =>
  value.toFixed(digits).replace('.', ',');

/** 0.0712 -> "7%"; with one digit "7,1%"; null -> "—". */
export const formatPct = (
  value: number | null | undefined,
  digits = 0,
): string => (value == null ? '—' : `${decimal(value * 100, digits)}%`);

/** Discount implied by the store's own reference price, or null when there is none. */
export const discount = (
  price: number | null,
  listPrice: number | null,
): number | null =>
  price != null && listPrice != null && listPrice > price && price > 0
    ? 1 - price / listPrice
    : null;

/** 0.042 -> "+4,2%" (0 -> "0%"). */
export const formatPremium = (value: number | null | undefined): string => {
  if (value == null) return '—';
  if (Math.abs(value) < 0.0005) return '0%';
  return `${value > 0 ? '+' : '−'}${decimal(Math.abs(value) * 100, 1)}%`;
};

/** Hours between a UTC timestamp from Domo ("2026-11-20T15:03:12" or "2026-11-20 15:03:12") and now. */
export const hoursSince = (
  utcText: string,
  now: Date = new Date(),
): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(
    utcText.trim(),
  );
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  return (now.getTime() - Date.UTC(y, mo - 1, d, h, mi)) / 3_600_000;
};

/** "1 loja" / "3 lojas": the count with the singular or plural form of what is counted. */
export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/** How long ago, to follow "há": "12 min", "3 h", "2 dias". */
export const formatAge = (hours: number): string => {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return plural(Math.round(hours / 24), 'dia', 'dias');
};

/** "2026-11-20 12:03:12" -> "20/11/2026 12:03" (the text is already Brasília time). */
export const formatRunTime = (text: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(text.trim());
  if (!match) return text.trim() || '—';
  const [, y, mo, d, h, mi] = match;
  return `${d}/${mo}/${y} ${h}:${mi}`;
};

const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** "2026-11-20" -> "20 nov". */
export const shortDate = (date: string): string => {
  const [, m, d] = date.split('-').map(Number);
  return m && d ? `${d} ${MONTHS[m - 1]}` : date;
};
