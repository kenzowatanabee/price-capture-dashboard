import type { PriceRow } from 'services/prices';

const byText = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
const isPriced = (row: PriceRow): boolean =>
  row.status === 'Success' && row.price != null;
const pricedCell = (row: PriceRow | undefined): row is PriceRow =>
  row != null && isPriced(row);

// ---------- price matrix: SKU x store, for one run ----------

export interface MatrixRow {
  ean: string;
  descSku: string;
  cells: Record<string, PriceRow | undefined>;
  min: number | null;
  max: number | null;
  /** (max - min) / min across stores with a price. */
  spread: number | null;
  /** Stores at the minimum price. */
  cheapest: string[];
}

export interface Matrix {
  stores: string[];
  rows: MatrixRow[];
}

export const buildMatrix = (rows: PriceRow[]): Matrix => {
  const stores = [...new Set(rows.map((r) => r.store))].sort(byText);
  const bySku = new Map<string, MatrixRow>();
  for (const row of rows) {
    const entry =
      bySku.get(row.ean) ??
      ({
        ean: row.ean,
        descSku: row.descSku,
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
    const priced = Object.values(entry.cells).filter(pricedCell);
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
