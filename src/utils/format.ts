const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatBRL = (value: number | null | undefined): string =>
  value == null ? '—' : brl.format(value);

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
