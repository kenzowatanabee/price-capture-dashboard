import Query, { OrderByDirection } from '@domoinc/query';

/** A value as Domo's data API returns it (numbers for numeric columns, text otherwise). */
export type DataValue = string | number | null;
export type DataRow = Record<string, DataValue>;

/** A data API query, as plain data (easy to fake and assert in tests). */
export interface DataQuery {
  select: string[];
  /** Column = value conditions, combined with AND. */
  where?: { column: string; equals: string }[];
  orderBy?: { column: string; direction: 'ascending' | 'descending' };
  limit?: number;
}

/** Runs a DataQuery against the dataset and returns its rows. */
export type QueryFn = (query: DataQuery) => Promise<DataRow[]>;

/** Alias of the PRICE_TRACKER dataset, as declared in public/manifest.json. */
export const PRICES_ALIAS = 'prices';

/** Translates a DataQuery into Domo's query builder. */
export const buildQuery = (q: DataQuery): Query => {
  let query = new Query().select(q.select);
  for (const condition of q.where ?? []) {
    query = query.where(condition.column).equals(condition.equals);
  }
  if (q.orderBy) {
    query = query.orderBy(
      q.orderBy.column,
      q.orderBy.direction === 'descending'
        ? OrderByDirection.DESCENDING
        : OrderByDirection.ASCENDING,
    );
  }
  if (q.limit != null) query = query.limit(q.limit);
  return query;
};

/** A QueryFn backed by Domo's data API (through the app's manifest mapping). */
export const domoQuery =
  (alias: string): QueryFn =>
  (q) =>
    buildQuery(q).fetch<DataRow>(alias);
