import { babyHistory, latestRun, priceRow } from 'fixtures/prices';
import { describe, expect, test } from 'vitest';

import { discount, formatBRL, formatPct } from './format';
import {
  buildHistory,
  buildMatrix,
  computeOverview,
  rowDate,
} from './insights';

describe('price matrix', () => {
  const matrix = buildMatrix(latestRun);

  test('stores and SKUs are sorted', () => {
    expect(matrix.stores).toEqual([
      'Drogaria São Paulo',
      'Drogaria Venancio',
      'Drogasil',
      'Farmácia Indiana',
    ]);
    expect(matrix.rows.map((r) => r.ean)).toEqual([
      '7509546060781',
      '7509546651040',
    ]);
  });

  test('min, max, spread and the cheapest stores use priced rows only', () => {
    const baby = matrix.rows[0];
    expect([baby.min, baby.max]).toEqual([21.99, 31.9]);
    expect(baby.spread).toBeCloseTo((31.9 - 21.99) / 21.99);
    expect(baby.cheapest).toEqual(['Drogaria São Paulo', 'Drogasil']); // a tie
    const luminous = matrix.rows[1];
    expect([luminous.min, luminous.max, luminous.cheapest]).toEqual([
      8.99,
      15.29,
      ['Drogaria Venancio'],
    ]);
    expect(luminous.cells['Farmácia Indiana']?.status).toBe('Not Found');
  });

  test('a SKU with no price anywhere has no stats', () => {
    const m = buildMatrix([priceRow({ status: 'Error', price: null })]);
    expect([m.rows[0].min, m.rows[0].spread, m.rows[0].cheapest]).toEqual([
      null,
      null,
      [],
    ]);
  });
});

describe('overview', () => {
  const o = computeOverview(latestRun);

  test('totals', () => {
    expect(o).toMatchObject({
      runId: 'gh-1001-1',
      skus: 2,
      checked: 8,
      priced: 7,
      errors: 0,
    });
    expect([o.availabilityChecked, o.purchasable]).toEqual([5, 4]);
  });

  test('per store, with reason codes of the non-priced rows', () => {
    const indiana = o.stores.find((s) => s.store === 'Farmácia Indiana');
    expect(indiana).toMatchObject({
      checked: 2,
      priced: 1,
      availabilityChecked: 1,
      purchasable: 0,
    });
    expect(indiana?.topCodes).toEqual([{ code: 'NOT_LISTED', count: 1 }]);
  });
});

describe('history', () => {
  const h = buildHistory(babyHistory);

  test('one point per day, last priced value of the day, gaps as null', () => {
    expect(h.stores).toEqual(['Drogaria Venancio', 'Drogasil']);
    expect(h.points).toEqual([
      { date: '2026-11-18', Drogasil: 23.69, 'Drogaria Venancio': 23.59 },
      { date: '2026-11-19', Drogasil: 21.99, 'Drogaria Venancio': null },
      { date: '2026-11-20', Drogasil: 21.99, 'Drogaria Venancio': 23.59 },
    ]);
  });

  test('summary per store', () => {
    expect(h.summary).toEqual([
      { store: 'Drogaria Venancio', latest: 23.59, min: 23.59, max: 23.59 },
      { store: 'Drogasil', latest: 21.99, min: 21.99, max: 23.69 },
    ]);
  });

  test('older rows without a Brasilia timestamp fall back to the UTC date', () => {
    expect(
      rowDate(priceRow({ fetchedAtBrt: '', fetchedAt: '2026-01-05 15:00:00' })),
    ).toBe('2026-01-05');
  });
});

describe('formatting', () => {
  test('currency, percent and discount', () => {
    expect(formatBRL(21.99).replace(/\s/g, ' ')).toBe('R$ 21,99');
    expect(formatBRL(null)).toBe('—');
    expect(formatPct(0.0717)).toBe('7%');
    expect(discount(21.99, 23.69)).toBeCloseTo(1 - 21.99 / 23.69);
    expect(discount(21.99, 21.99)).toBeNull();
    expect(discount(21.99, null)).toBeNull();
  });
});
