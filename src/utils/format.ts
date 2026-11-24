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

/** 0.0712 -> "7%"; null -> "—". */
export const formatPct = (
  value: number | null | undefined,
  digits = 0,
): string => (value == null ? '—' : `${(value * 100).toFixed(digits)}%`);

/** Discount implied by the store's own reference price, or null when there is none. */
export const discount = (
  price: number | null,
  listPrice: number | null,
): number | null =>
  price != null && listPrice != null && listPrice > price && price > 0
    ? 1 - price / listPrice
    : null;

/** 0.042 -> "+4.2%" (0 -> "0%"). */
export const formatPremium = (value: number | null | undefined): string => {
  if (value == null) return '—';
  if (Math.abs(value) < 0.0005) return '0%';
  return `${value > 0 ? '+' : '−'}${(Math.abs(value) * 100).toFixed(1)}%`;
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

/** "12 min ago", "3 h ago", "2 days ago". */
export const formatAge = (hours: number): string => {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min ago`;
  if (hours < 48) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} days ago`;
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "2026-11-20" -> "20 Nov". */
export const shortDate = (date: string): string => {
  const [, m, d] = date.split('-').map(Number);
  return m && d ? `${d} ${MONTHS[m - 1]}` : date;
};
