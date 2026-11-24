import { SqlClient } from '@domoinc/toolkit';

/** One result row, keyed by column name. Domo's SQL API returns every value as text. */
export type SqlRow = Record<string, string>;

/** Runs a SQL query against a dataset alias and returns the rows as objects. */
export type QueryFn = (sql: string) => Promise<SqlRow[]>;

/** Alias of the PRICE_TRACKER dataset, as declared in public/manifest.json. */
export const PRICES_ALIAS = 'prices';

export const toObjects = (
  columns: string[],
  rows: (string | number | null)[][],
): SqlRow[] =>
  rows.map((row) =>
    Object.fromEntries(
      columns.map((column, i) => [
        column,
        row[i] == null ? '' : String(row[i]),
      ]),
    ),
  );

/** A QueryFn backed by Domo's SQL API (through the app's manifest mapping). */
export const domoQuery =
  (alias: string): QueryFn =>
  async (sql) => {
    const response = await new SqlClient().get(alias, sql);
    if (response.statusCode >= 400) {
      throw new Error(
        `Domo SQL query failed (${response.statusCode}): ${response.message ?? ''}`,
      );
    }
    const { columns, rows } = response.data;
    return toObjects(columns, rows);
  };

/** Quotes a value as a SQL string literal. */
export const sqlString = (value: string): string =>
  `'${value.replace(/'/g, "''")}'`;
