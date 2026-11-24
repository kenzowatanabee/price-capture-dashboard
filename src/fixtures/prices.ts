import type { PriceRow } from 'services/prices';

/** Builds a PriceRow with sensible defaults (values taken from real scraper output). */
export const priceRow = (overrides: Partial<PriceRow> = {}): PriceRow => ({
  runId: 'gh-1001-1',
  ean: '7509546060781',
  descSku: 'CREME DENTAL COLGATE BABY SEM FLUOR 50g SINGLE',
  store: 'Drogasil',
  status: 'Success',
  price: 21.99,
  listPrice: 23.69,
  foundName: 'Gel Dental Colgate Baby 50g',
  message: '',
  code: null,
  available: null,
  seller: '',
  url: '',
  fetchedAt: '2026-11-20 15:03:12',
  fetchedAtBrt: '2026-11-20 12:03:12',
  ...overrides,
});

const BABY = {
  ean: '7509546060781',
  descSku: 'CREME DENTAL COLGATE BABY SEM FLUOR 50g SINGLE',
};
const LUMINOUS = {
  ean: '7509546651040',
  descSku: 'CREME DENTAL COLGATE LUMINOUS WHITE CARVAO ATIVADO 70g SINGLE',
};

/** One scraper run: 2 SKUs x 4 stores, including the cases the app must show. */
export const latestRun: PriceRow[] = [
  priceRow({ ...BABY, store: 'Drogasil', price: 21.99, listPrice: 23.69 }),
  priceRow({
    ...BABY,
    store: 'Drogaria São Paulo',
    price: 21.99,
    listPrice: 21.99,
    available: true,
  }),
  priceRow({
    ...BABY,
    store: 'Drogaria Venancio',
    price: 23.59,
    listPrice: 23.59,
    available: true,
  }),
  priceRow({
    ...BABY,
    store: 'Farmácia Indiana',
    price: 31.9,
    listPrice: 35.0,
    available: false,
    message: 'NOT_PURCHASABLE: cannotBeDelivered for CEP 01310100',
    code: 'NOT_PURCHASABLE',
  }),
  priceRow({ ...LUMINOUS, store: 'Drogasil', price: 15.29, listPrice: 16.79 }),
  priceRow({
    ...LUMINOUS,
    store: 'Drogaria São Paulo',
    price: 10.19,
    listPrice: 11.59,
    available: true,
  }),
  priceRow({
    ...LUMINOUS,
    store: 'Drogaria Venancio',
    price: 8.99,
    listPrice: 10.7,
    available: true,
  }),
  priceRow({
    ...LUMINOUS,
    store: 'Farmácia Indiana',
    status: 'Not Found',
    price: null,
    listPrice: null,
    message: 'NOT_LISTED: store returned no product',
    code: 'NOT_LISTED',
  }),
];

/** Three days of history for the Baby gel at two stores (oldest first). */
export const babyHistory: PriceRow[] = [
  priceRow({
    store: 'Drogasil',
    price: 23.69,
    fetchedAtBrt: '2026-11-18 12:01:00',
  }),
  priceRow({
    store: 'Drogaria Venancio',
    price: 23.59,
    fetchedAtBrt: '2026-11-18 12:02:00',
  }),
  priceRow({
    store: 'Drogasil',
    price: 21.99,
    fetchedAtBrt: '2026-11-19 12:01:00',
  }),
  priceRow({
    store: 'Drogaria Venancio',
    status: 'Error',
    price: null,
    message: 'TIMEOUT: x',
    code: 'TIMEOUT',
    fetchedAtBrt: '2026-11-19 12:02:00',
  }),
  priceRow({
    store: 'Drogasil',
    price: 21.99,
    fetchedAtBrt: '2026-11-20 12:01:00',
  }),
  priceRow({
    store: 'Drogaria Venancio',
    price: 22.49,
    fetchedAtBrt: '2026-11-20 09:00:00',
  }),
  priceRow({
    store: 'Drogaria Venancio',
    price: 23.59,
    fetchedAtBrt: '2026-11-20 12:02:00',
  }),
];
