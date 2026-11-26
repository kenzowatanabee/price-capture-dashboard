import type { DataQuery, DataRow } from 'services/domo';
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
  sellerId: '',
  sellerType: null,
  mainOffer: true,
  sellerCnpj: '',
  url: '',
  imageUrl: '',
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
    url: 'https://www.drogasil.com.br/gel-dental-colgate-baby-50g-62451.html',
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

/** The dataset row behind a PriceRow, as Domo's data API returns it (numbers for numeric columns). */
export const toDataRow = (row: PriceRow): DataRow => ({
  run_id: row.runId,
  ean: row.ean,
  desc_sku: row.descSku,
  store: row.store,
  status: row.status,
  price_brl: row.price,
  list_price: row.listPrice,
  found_name: row.foundName,
  message: row.message,
  available: row.available == null ? '' : String(row.available),
  seller: row.seller,
  seller_id: row.sellerId,
  seller_type: row.sellerType ?? '',
  main_offer: row.mainOffer ? 'true' : 'false',
  seller_cnpj: row.sellerCnpj,
  url: row.url,
  image_url: row.imageUrl,
  fetched_at: row.fetchedAt,
  fetched_at_brt: row.fetchedAtBrt,
});

/** Segmentation rows as the segmentation dataset returns them (keys are the manifest aliases). */
export const latestSegments: DataRow[] = [
  {
    ean: '7509546060781',
    CATEGORY: 'Oral Care',
    SUB_CATEGORY: 'Toothpaste',
    SUPPLIER: 'Colgate-Palmolive',
    BRAND: 'Colgate',
    SUB_BRAND: 'Baby',
    SEGMENT: 'Kids',
    SUBSEGMENT: 'Fluoride free',
  },
  {
    ean: '7509546651040',
    CATEGORY: 'Oral Care',
    SUB_CATEGORY: 'Toothpaste',
    SUPPLIER: 'Colgate-Palmolive',
    BRAND: 'Colgate',
    SUB_BRAND: 'Luminous White',
    SEGMENT: 'Whitening',
    SUBSEGMENT: 'Charcoal',
  },
];

/** A fake segmentation dataset answering with the given rows. */
export const fakeSegments =
  (rows: DataRow[] = latestSegments) =>
  async (): Promise<DataRow[]> =>
    rows;

/** A fake Domo: answers the app's queries from the fixtures above. */
export const fakeDomo = (
  overrides: { fail?: boolean; run?: PriceRow[] } = {},
) => {
  const queries: DataQuery[] = [];
  const query = async (q: DataQuery): Promise<DataRow[]> => {
    queries.push(q);
    if (overrides.fail) throw new Error('Domo is unreachable');
    const filter = q.where?.[0];
    if (!filter && q.limit === 1)
      return [{ run_id: 'gh-1001-1', fetched_at: '2026-11-20T15:03:12' }];
    if (filter?.column === 'run_id' && filter.equals === 'gh-1001-1')
      return (overrides.run ?? latestRun).map(toDataRow);
    if (filter?.column === 'ean' && filter.equals === '7509546060781')
      return babyHistory.map(toDataRow);
    return [];
  };
  return { query, queries };
};
