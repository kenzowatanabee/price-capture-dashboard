import { babyHistory, priceRow } from 'fixtures/prices';
import { defaultSlots } from 'utils/colors';
import { buildHistory } from 'utils/insights';
import { describe, expect, test } from 'vitest';

describe('default highlight', () => {
  test('the cheapest stores at their latest price, at most three', () => {
    const series = buildHistory([
      ...babyHistory, // latest: Drogasil 21.99, Venancio 23.59
      priceRow({ store: 'A', price: 19 }),
      priceRow({ store: 'B', price: 30 }),
    ]);
    expect(defaultSlots(series)).toEqual({
      A: 0,
      Drogasil: 1,
      'Drogaria Venancio': 2,
    });
  });
});
