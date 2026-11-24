import { babyHistory, latestRun, priceRow } from 'fixtures/prices';
import { describe, expect, test } from 'vitest';

import {
  discount,
  formatAge,
  formatBRL,
  formatPct,
  formatPremium,
  hoursSince,
} from './format';
import {
  buildHistory,
  buildMatrix,
  cellPremium,
  computeOverview,
  premiumStep,
  reasonLabel,
  rowDate,
  skuImage,
  storeComparison,
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

  test('min, max, spread and the cheapest stores use purchasable priced rows only', () => {
    const baby = matrix.rows[0];
    // Indiana's 31.90 cannot be bought (cart check), so it does not set the range
    expect([baby.min, baby.max]).toEqual([21.99, 23.59]);
    expect(baby.spread).toBeCloseTo((23.59 - 21.99) / 21.99);
    expect(baby.cheapest).toEqual(['Drogaria São Paulo', 'Drogasil']); // a tie
    const luminous = matrix.rows[1];
    expect([luminous.min, luminous.max, luminous.cheapest]).toEqual([
      8.99,
      15.29,
      ['Drogaria Venancio'],
    ]);
    expect(luminous.cells['Farmácia Indiana']?.status).toBe('Not Found');
  });

  test('an unpurchasable price is never the cheapest', () => {
    const m = buildMatrix([
      priceRow({ store: 'A', price: 5, available: false }),
      priceRow({ store: 'B', price: 9, available: true }),
      priceRow({ store: 'C', price: 7 }), // no cart check (RD): counts
    ]);
    expect([m.rows[0].min, m.rows[0].max, m.rows[0].cheapest]).toEqual([
      7,
      9,
      ['C'],
    ]);
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
      {
        store: 'Drogaria Venancio',
        latest: 23.59,
        min: 23.59,
        max: 23.59,
        url: null,
      },
      {
        store: 'Drogasil',
        latest: 21.99,
        min: 21.99,
        max: 23.69,
        url: 'https://www.drogasil.com.br/gel-dental-colgate-baby-50g-62451.html',
      },
    ]);
  });

  test('each store keeps the page url of its most recent priced row', () => {
    const summary = buildHistory([
      priceRow({ store: 'A', url: 'https://a.test/old' }),
      priceRow({ store: 'A', url: 'https://a.test/new' }),
      priceRow({ store: 'A', url: '' }),
    ]).summary;
    expect(summary[0].url).toBe('https://a.test/new');
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

describe('store comparison', () => {
  test('average premium over the cheapest offer, wins and promotions per store', () => {
    const c = storeComparison(latestRun);
    // Baby gel (cheapest 21.99, Indiana unpurchasable so excluded) and Luminous (cheapest 8.99)
    const byStore = Object.fromEntries(c.map((s) => [s.store, s]));
    expect(byStore['Drogaria Venancio']).toMatchObject({
      compared: 2,
      wins: 1,
    });
    expect(byStore['Drogaria Venancio'].avgPremium).toBeCloseTo(
      (23.59 / 21.99 - 1 + 0) / 2,
    );
    expect(byStore['Drogasil']).toMatchObject({ compared: 2, wins: 1 });
    expect(byStore['Drogasil'].avgPremium).toBeCloseTo(
      (0 + 15.29 / 8.99 - 1) / 2,
    );
    expect(byStore['Drogaria São Paulo'].avgPremium).toBeCloseTo(
      (0 + 10.19 / 8.99 - 1) / 2,
    );
    // Indiana: its only price cannot be bought -> nothing compared
    expect(byStore['Farmácia Indiana']).toMatchObject({
      compared: 0,
      wins: 0,
      avgPremium: null,
    });
    // promotions: price below the store's own list price, among its purchasable prices
    expect(byStore['Drogasil'].promoShare).toBe(1);
    expect(byStore['Drogaria São Paulo'].promoShare).toBe(0.5);
  });

  test('sorted cheapest first, stores without comparisons last', () => {
    const order = storeComparison(latestRun).map((s) => s.store);
    expect(order[order.length - 1]).toBe('Farmácia Indiana');
    expect(order[0]).toBe('Drogaria Venancio');
  });

  test('a SKU sold by only one store is not compared', () => {
    const c = storeComparison([priceRow({ store: 'A', price: 9 })]);
    expect(c[0]).toMatchObject({ compared: 0, wins: 0, avgPremium: null });
  });
});

describe('premium and freshness formatting', () => {
  test('premium', () => {
    expect(formatPremium(0.0423)).toBe('+4.2%');
    expect(formatPremium(0)).toBe('0%');
    expect(formatPremium(-0.1)).toBe('−10.0%');
    expect(formatPremium(null)).toBe('—');
  });

  test('hours since a UTC timestamp, in either Domo format', () => {
    const now = new Date(Date.UTC(2026, 10, 20, 18, 3));
    expect(hoursSince('2026-11-20T15:03:12', now)).toBeCloseTo(3);
    expect(hoursSince('2026-11-20 15:03:12', now)).toBeCloseTo(3);
    expect(hoursSince('not a date', now)).toBeNull();
  });

  test('age', () => {
    expect(formatAge(0.2)).toBe('12 min ago');
    expect(formatAge(3.4)).toBe('3 h ago');
    expect(formatAge(50)).toBe('2 days ago');
  });
});

describe('matrix cell helpers', () => {
  test('premium over the lowest purchasable price', () => {
    expect(cellPremium(priceRow({ price: 11 }), 10)).toBeCloseTo(0.1);
    expect(
      cellPremium(priceRow({ price: 11, available: false }), 10),
    ).toBeNull();
    expect(
      cellPremium(priceRow({ status: 'Not Found', price: null }), 10),
    ).toBeNull();
    expect(cellPremium(undefined, 10)).toBeNull();
  });

  test('tint steps', () => {
    expect([0, 0.03, 0.1, 0.2, 0.6, null].map(premiumStep)).toEqual([
      0,
      1,
      2,
      3,
      4,
      null,
    ]);
  });

  test('plain-language reasons', () => {
    expect(reasonLabel(priceRow({ code: 'NOT_LISTED' }))).toBe('Not listed');
    expect(reasonLabel(priceRow({ code: 'WHATEVER', status: 'Error' }))).toBe(
      'Error',
    );
    expect(reasonLabel(priceRow({ code: null, status: 'Not Found' }))).toBe(
      'No price',
    );
  });
});

describe('skuImage', () => {
  test('first picture any store sent, in store-name order', () => {
    const rows = [
      priceRow({ store: 'Zeta', imageUrl: 'https://z.test/1.jpg' }),
      priceRow({ store: 'Alfa', imageUrl: '' }),
      priceRow({ store: 'Beta', imageUrl: 'https://b.test/1.jpg' }),
    ];
    expect(skuImage(rows)).toBe('https://b.test/1.jpg');
    expect(buildMatrix(rows).rows[0].imageUrl).toBe('https://b.test/1.jpg');
  });

  test('null when no store sent one', () => {
    expect(skuImage([priceRow(), undefined])).toBeNull();
  });
});
