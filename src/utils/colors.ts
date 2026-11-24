/** Distinct, colour-blind friendly line colours (Okabe-Ito + extras), one per store. */
export const STORE_COLORS = [
  '#0072B2',
  '#E69F00',
  '#009E73',
  '#CC79A7',
  '#56B4E9',
  '#D55E00',
  '#000000',
  '#F0E442',
  '#7F7F7F',
  '#8C564B',
];

export const storeColor = (index: number): string =>
  STORE_COLORS[index % STORE_COLORS.length];
