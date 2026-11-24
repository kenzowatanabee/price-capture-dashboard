import { describe, expect, test } from 'vitest';

import {
  fetchHistory,
  fetchLatestRunId,
  fetchRun,
  parseAvailable,
  parseNumber,
  reasonCode,
  toPriceRow,
} from './prices';
import type { SqlRow } from './sql';

const fakeQuery = (rows: SqlRow[]) => {
  const seen: string[] = [];
  const query = async (sql: string) => {
    seen.push(sql);
    return rows;
  };
  return { query, seen };
};

describe('parsing Domo text values', () => {
  test('numbers', () => {
    expect(parseNumber('21.99')).toBe(21.99);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('  ')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });

  test('availability', () => {
    expect(parseAvailable('true')).toBe(true);
    expect(parseAvailable('false')).toBe(false);
    expect(parseAvailable('')).toBeNull();
  });

  test('reason code is the prefix of the message', () => {
    expect(
      reasonCode('NOT_PURCHASABLE: cannotBeDelivered for CEP 01310100'),
    ).toBe('NOT_PURCHASABLE');
    expect(reasonCode('')).toBeNull();
    expect(reasonCode('free text')).toBeNull();
  });

  test('a dataset row becomes a typed PriceRow', () => {
    const row = toPriceRow({
      run_id: 'gh-9-1',
      ean: '7509546060781',
      desc_sku: 'X',
      store: 'Drogasil',
      status: 'Success',
      price_brl: '21.99',
      list_price: '23.69',
      found_name: 'Gel',
      message: '',
      available: '',
      seller: '',
      url: 'https://x',
      fetched_at: '2026-11-20 15:00:00',
      fetched_at_brt: '2026-11-20 12:00:00',
    });
    expect(row).toMatchObject({
      runId: 'gh-9-1',
      price: 21.99,
      listPrice: 23.69,
      available: null,
      code: null,
    });
  });
});

describe('queries', () => {
  test('latest run id ignores rows without a run id and takes the newest', async () => {
    const { query, seen } = fakeQuery([
      { run_id: 'gh-9-1', last_fetch: '2026-11-20' },
    ]);
    await expect(fetchLatestRunId(query)).resolves.toBe('gh-9-1');
    expect(seen[0]).toContain("run_id <> ''");
    expect(seen[0]).toContain('ORDER BY last_fetch DESC LIMIT 1');
    expect(seen[0]).toContain('FROM prices');
  });

  test('no runs gives null', async () => {
    await expect(fetchLatestRunId(fakeQuery([]).query)).resolves.toBeNull();
  });

  test('a run is fetched by its quoted run id', async () => {
    const { query, seen } = fakeQuery([
      { run_id: 'gh-9-1', store: 'Drogasil', price_brl: '1.5' },
    ]);
    const rows = await fetchRun(query, 'gh-9-1');
    expect(seen[0]).toContain("WHERE run_id = 'gh-9-1'");
    expect(rows[0]).toMatchObject({ store: 'Drogasil', price: 1.5 });
  });

  test('history only accepts a numeric EAN', async () => {
    const { query, seen } = fakeQuery([]);
    await fetchHistory(query, '7509546060781');
    expect(seen[0]).toContain(
      "WHERE ean = '7509546060781' ORDER BY fetched_at",
    );
    await expect(fetchHistory(query, "1' OR '1'='1")).rejects.toThrow(
      'Invalid EAN',
    );
  });
});
