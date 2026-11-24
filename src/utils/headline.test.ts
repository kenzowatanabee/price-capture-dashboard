import { describe, expect, test } from 'vitest';

import { overviewHeadline } from './headline';
import type { StoreComparison } from './insights';

const store = (
  name: string,
  avgPremium: number | null,
  wins = 1,
  compared = 2,
): StoreComparison => ({
  store: name,
  compared: avgPremium == null ? 0 : compared,
  wins: avgPremium == null ? 0 : wins,
  avgPremium,
  promoShare: null,
});

describe('overviewHeadline', () => {
  test('names the store with the lowest average premium', () => {
    const h = overviewHeadline([store('A', 0.036), store('B', 0.2)], 2);
    expect(h.title).toBe('A is the cheapest store right now.');
    expect(h.lede).toContain('3.6% above the lowest purchasable offer');
    expect(h.lede).toContain('cheapest on 1 of the 2 SKUs');
  });

  test('a store that is always the lowest', () => {
    const h = overviewHeadline([store('A', 0, 3, 3), store('B', 0.2)], 3);
    expect(h.lede).toBe(
      'It has the lowest purchasable price on all 3 SKUs it shares with another store.',
    );
  });

  test('ties are not broken arbitrarily', () => {
    expect(
      overviewHeadline([store('A', 0.05), store('B', 0.05)], 2).title,
    ).toBe('A and B are tied as the cheapest stores.');
    expect(
      overviewHeadline(
        [store('A', 0.05), store('B', 0.05), store('C', 0.05)],
        2,
      ).title,
    ).toBe('3 stores are tied as the cheapest.');
  });

  test('nothing to compare', () => {
    const h = overviewHeadline([store('A', null)], 1);
    expect(h.title).toBe('Store prices, side by side.');
    expect(h.lede).toContain('1 SKU in the latest run');
  });
});
