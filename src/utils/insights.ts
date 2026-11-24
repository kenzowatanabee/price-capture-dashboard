import type { PriceRow } from 'services/prices';

const byText = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
const isPriced = (row: PriceRow): boolean =>
  row.status === 'Success' && row.price != null;
/** Priced and not known to be unpurchasable: the offers a customer can actually compare. */
const comparableCell = (row: PriceRow | undefined): row is PriceRow =>
  row != null && isPriced(row) && row.available !== false;

// ---------- price matrix: SKU x store, for one run ----------

export interface MatrixRow {
  ean: string;
  descSku: string;
  /** A picture of the product: the first one any store sent, in store-name order. */
  imageUrl: string | null;
  cells: Record<string, PriceRow | undefined>;
  min: number | null;
  max: number | null;
  /** (max - min) / min across stores with a purchasable price. */
  spread: number | null;
  /** Stores at the minimum purchasable price. */
  cheapest: string[];
}

export interface Matrix {
  stores: string[];
  rows: MatrixRow[];
}

/** The picture to show for a SKU: the first one any store sent, in store-name order. */
export const skuImage = (rows: (PriceRow | undefined)[]): string | null =>
  rows
    .filter((r): r is PriceRow => !!r?.imageUrl)
    .sort((a, b) => byText(a.store, b.store))[0]?.imageUrl ?? null;

export const buildMatrix = (rows: PriceRow[]): Matrix => {
  const stores = [...new Set(rows.map((r) => r.store))].sort(byText);
  const bySku = new Map<string, MatrixRow>();
  for (const row of rows) {
    const entry =
      bySku.get(row.ean) ??
      ({
        ean: row.ean,
        descSku: row.descSku,
        imageUrl: null,
        cells: {},
        min: null,
        max: null,
        spread: null,
        cheapest: [],
      } as MatrixRow);
    entry.cells[row.store] = row;
    bySku.set(row.ean, entry);
  }
  for (const entry of bySku.values()) {
    entry.imageUrl = skuImage(Object.values(entry.cells));
    const priced = Object.values(entry.cells).filter(comparableCell);
    if (priced.length) {
      const prices = priced.map((r) => r.price as number);
      entry.min = Math.min(...prices);
      entry.max = Math.max(...prices);
      entry.spread = entry.min > 0 ? (entry.max - entry.min) / entry.min : null;
      entry.cheapest = priced
        .filter((r) => r.price === entry.min)
        .map((r) => r.store)
        .sort(byText);
    }
  }
  return {
    stores,
    rows: [...bySku.values()].sort((a, b) => byText(a.descSku, b.descSku)),
  };
};

// ---------- overview: health of one run ----------

export interface StoreHealth {
  store: string;
  checked: number;
  priced: number;
  /** Priced rows whose purchasability is known (VTEX cart check). */
  availabilityChecked: number;
  purchasable: number;
  errors: number;
  /** Non-success reason codes, most frequent first. */
  topCodes: { code: string; count: number }[];
}

export interface Overview {
  runId: string;
  fetchedAtBrt: string;
  /** Newest UTC timestamp of the run. */
  fetchedAt: string;
  skus: number;
  checked: number;
  priced: number;
  availabilityChecked: number;
  purchasable: number;
  errors: number;
  stores: StoreHealth[];
}

export const computeOverview = (rows: PriceRow[]): Overview => {
  const perStore = new Map<
    string,
    StoreHealth & { codes: Map<string, number> }
  >();
  for (const row of rows) {
    const s = perStore.get(row.store) ?? {
      store: row.store,
      checked: 0,
      priced: 0,
      availabilityChecked: 0,
      purchasable: 0,
      errors: 0,
      topCodes: [],
      codes: new Map<string, number>(),
    };
    s.checked += 1;
    if (isPriced(row)) {
      s.priced += 1;
      if (row.available != null) {
        s.availabilityChecked += 1;
        if (row.available) s.purchasable += 1;
      }
    } else {
      if (row.status === 'Error') s.errors += 1;
      const code = row.code ?? row.status;
      s.codes.set(code, (s.codes.get(code) ?? 0) + 1);
    }
    perStore.set(row.store, s);
  }
  const stores = [...perStore.values()]
    .map(({ codes, ...s }) => ({
      ...s,
      topCodes: [...codes.entries()]
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count || byText(a.code, b.code)),
    }))
    .sort((a, b) => byText(a.store, b.store));
  const sum = (
    key:
      'checked' | 'priced' | 'availabilityChecked' | 'purchasable' | 'errors',
  ) => stores.reduce((total, s) => total + s[key], 0);
  const latest = rows.reduce(
    (max, r) => (r.fetchedAtBrt > max ? r.fetchedAtBrt : max),
    '',
  );
  return {
    runId: rows[0]?.runId ?? '',
    fetchedAtBrt: latest,
    fetchedAt: rows.reduce(
      (max, r) => (r.fetchedAt > max ? r.fetchedAt : max),
      '',
    ),
    skus: new Set(rows.map((r) => r.ean)).size,
    checked: sum('checked'),
    priced: sum('priced'),
    availabilityChecked: sum('availabilityChecked'),
    purchasable: sum('purchasable'),
    errors: sum('errors'),
    stores,
  };
};

// ---------- history: one SKU over time ----------

export interface HistoryPoint {
  /** YYYY-MM-DD */
  date: string;
  [store: string]: number | string | null;
}

export interface StoreSummary {
  store: string;
  latest: number | null;
  min: number | null;
  max: number | null;
}

export interface HistorySeries {
  stores: string[];
  points: HistoryPoint[];
  summary: StoreSummary[];
}

/** Calendar day of a row: the Brasilia date when known, otherwise the UTC date. */
export const rowDate = (row: PriceRow): string =>
  (row.fetchedAtBrt || row.fetchedAt).slice(0, 10);

/** One point per day and store: the last priced observation of that day. Rows must be oldest first. */
export const buildHistory = (rows: PriceRow[]): HistorySeries => {
  const priced = rows.filter(isPriced);
  const stores = [...new Set(priced.map((r) => r.store))].sort(byText);
  const days = new Map<string, HistoryPoint>();
  for (const row of priced) {
    const date = rowDate(row);
    const point = days.get(date) ?? ({ date } as HistoryPoint);
    point[row.store] = row.price; // later rows of the same day overwrite earlier ones
    days.set(date, point);
  }
  const points = [...days.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  for (const point of points) for (const store of stores) point[store] ??= null;
  const summary = stores.map((store) => {
    const values = points
      .map((p) => p[store])
      .filter((v): v is number => typeof v === 'number');
    return {
      store,
      latest: values.length ? values[values.length - 1] : null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    };
  });
  return { stores, points, summary };
};

// ---------- store comparison: who is cheapest, and by how much ----------

export interface StoreComparison {
  store: string;
  /** SKUs where this store and at least one other store have a purchasable price. */
  compared: number;
  /** Of those, SKUs where this store is (tied) cheapest. */
  wins: number;
  /** Mean of (price / cheapest - 1) over the compared SKUs; 0 = always cheapest. */
  avgPremium: number | null;
  /** Share of this store's purchasable prices below its own list price. */
  promoShare: number | null;
}

export const storeComparison = (rows: PriceRow[]): StoreComparison[] => {
  const comparable = rows.filter((r) => isPriced(r) && r.available !== false);
  const bySku = new Map<string, PriceRow[]>();
  for (const row of comparable) {
    bySku.set(row.ean, [...(bySku.get(row.ean) ?? []), row]);
  }
  const stats = new Map<
    string,
    {
      compared: number;
      wins: number;
      premium: number;
      priced: number;
      promo: number;
    }
  >();
  const entry = (store: string) => {
    const s = stats.get(store) ?? {
      compared: 0,
      wins: 0,
      premium: 0,
      priced: 0,
      promo: 0,
    };
    stats.set(store, s);
    return s;
  };
  for (const store of new Set(rows.map((r) => r.store))) entry(store);
  for (const row of comparable) {
    const s = entry(row.store);
    s.priced += 1;
    if (row.listPrice != null && row.price != null && row.listPrice > row.price)
      s.promo += 1;
  }
  for (const offers of bySku.values()) {
    if (new Set(offers.map((o) => o.store)).size < 2) continue;
    const min = Math.min(...offers.map((o) => o.price as number));
    if (min <= 0) continue;
    for (const offer of offers) {
      const s = entry(offer.store);
      s.compared += 1;
      s.premium += (offer.price as number) / min - 1;
      if (offer.price === min) s.wins += 1;
    }
  }
  return [...stats.entries()]
    .map(([store, s]) => ({
      store,
      compared: s.compared,
      wins: s.wins,
      avgPremium: s.compared ? s.premium / s.compared : null,
      promoShare: s.priced ? s.promo / s.priced : null,
    }))
    .sort((a, b) => {
      if (a.avgPremium == null || b.avgPremium == null) {
        return a.avgPremium == null
          ? b.avgPremium == null
            ? byText(a.store, b.store)
            : 1
          : -1;
      }
      return a.avgPremium - b.avgPremium || byText(a.store, b.store);
    });
};

// ---------- matrix cell helpers ----------

/** Price premium of a cell over the SKU's lowest purchasable price, or null when it has none. */
export const cellPremium = (
  row: PriceRow | undefined,
  min: number | null,
): number | null =>
  row != null &&
  isPriced(row) &&
  row.available !== false &&
  min != null &&
  min > 0
    ? (row.price as number) / min - 1
    : null;

/** Tint step 0-4 for a premium: 0 = lowest, then <=5%, <=15%, <=30%, >30%. */
export const premiumStep = (premium: number | null): number | null => {
  if (premium == null) return null;
  if (premium < 0.0005) return 0;
  if (premium <= 0.05) return 1;
  if (premium <= 0.15) return 2;
  if (premium <= 0.3) return 3;
  return 4;
};

const REASONS: Record<string, string> = {
  NOT_LISTED: 'Not listed',
  OUT_OF_STOCK: 'Out of stock',
  NO_PRICE: 'No price',
  ZERO_PRICE: 'Price 0',
  NO_STATE: 'Page changed',
  EAN_MISMATCH: 'Other product',
  TIMEOUT: 'Timeout',
  NETWORK: 'Network error',
  HTTP_ERROR: 'Blocked',
  BLOCKED: 'Blocked',
  PARSE_ERROR: 'Unreadable',
  SKIPPED: 'Store down',
  CONFIG: 'Config error',
};

/** Plain-language name of a reason code; unknown codes pass through. */
export const codeLabel = (code: string): string => REASONS[code] ?? code;

/** Short, plain-language reason for a cell without a usable price. */
export const reasonLabel = (row: PriceRow): string =>
  (row.code && REASONS[row.code]) ||
  (row.status === 'Error' ? 'Error' : 'No price');
