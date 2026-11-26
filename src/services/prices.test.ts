import { describe, expect, test } from 'vitest';

import type { DataQuery, DataRow } from './domo';
import {
  fetchHistory,
  fetchLatestRunId,
  fetchRun,
  parseAvailable,
  parseNumber,
  reasonCode,
  toPriceRow,
} from './prices';

const fakeQuery = (rows: DataRow[]) => {
  const seen: DataQuery[] = [];
  const query = async (q: DataQuery) => {
    seen.push(q);
    return rows;
  };
  return { query, seen };
};

describe('parsing Domo values', () => {
  test('numbers, whether Domo sends them as numbers or text', () => {
    expect(parseNumber(21.99)).toBe(21.99);
    expect(parseNumber('21.99')).toBe(21.99);
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });

  test('availability', () => {
    expect(parseAvailable('true')).toBe(true);
    expect(parseAvailable('false')).toBe(false);
    expect(parseAvailable('')).toBeNull();
    expect(parseAvailable(null)).toBeNull();
  });

  test('reason code is the prefix of the message', () => {
    expect(
      reasonCode('NOT_PURCHASABLE: cannotBeDelivered for CEP 01310100'),
    ).toBe('NOT_PURCHASABLE');
    expect(reasonCode('')).toBeNull();
    expect(reasonCode('free text')).toBeNull();
  });

  test('a dataset row becomes a typed PriceRow, nulls included', () => {
    const row = toPriceRow({
      run_id: 'gh-9-1',
      ean: '7509546060781',
      desc_sku: 'X',
      store: 'Drogasil',
      status: 'Success',
      price_brl: 21.99,
      list_price: null,
      found_name: 'Gel',
      message: null,
      available: '',
      seller: '',
      url: 'https://x',
      fetched_at: '2026-11-20T15:00:00',
      fetched_at_brt: '2026-11-20 12:00:00',
    });
    expect(row).toMatchObject({
      runId: 'gh-9-1',
      price: 21.99,
      listPrice: null,
      message: '',
      available: null,
      code: null,
    });
  });
});

describe('queries', () => {
  test("latest run id is the newest row's run", async () => {
    const { query, seen } = fakeQuery([
      { run_id: 'gh-9-1', fetched_at: '2026-11-20T15:00:00' },
    ]);
    await expect(fetchLatestRunId(query)).resolves.toBe('gh-9-1');
    expect(seen[0]).toEqual({
      select: ['run_id', 'fetched_at'],
      orderBy: { column: 'fetched_at', direction: 'descending' },
      limit: 1,
    });
  });

  test('no rows, or a newest row without a run id, gives null', async () => {
    await expect(fetchLatestRunId(fakeQuery([]).query)).resolves.toBeNull();
    await expect(
      fetchLatestRunId(fakeQuery([{ run_id: null }]).query),
    ).resolves.toBeNull();
  });

  test('a run is fetched by its run id, with every column the app uses', async () => {
    const { query, seen } = fakeQuery([
      { run_id: 'gh-9-1', store: 'Drogasil', price_brl: 1.5 },
    ]);
    const rows = await fetchRun(query, 'gh-9-1');
    expect(seen[0].where).toEqual([{ column: 'run_id', equals: 'gh-9-1' }]);
    expect(seen[0].select).toContain('fetched_at_brt');
    expect(rows[0]).toMatchObject({ store: 'Drogasil', price: 1.5 });
  });

  test('history is filtered by EAN, oldest first, and only accepts a numeric EAN', async () => {
    const { query, seen } = fakeQuery([]);
    await fetchHistory(query, '7509546060781');
    expect(seen[0].where).toEqual([{ column: 'ean', equals: '7509546060781' }]);
    expect(seen[0].orderBy).toEqual({
      column: 'fetched_at',
      direction: 'ascending',
    });
    await expect(fetchHistory(query, "1' OR '1'='1")).rejects.toThrow(
      'Invalid EAN',
    );
  });
});
