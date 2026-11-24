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
    expect(h.title).toBe('A é a loja mais barata no momento.');
    expect(h.lede).toContain('3,6% acima da menor oferta disponível');
    expect(h.lede).toContain('mais barata em 1 dos 2 SKUs');
  });

  test('a store that is always the lowest', () => {
    const h = overviewHeadline([store('A', 0, 3, 3), store('B', 0.2)], 3);
    expect(h.lede).toBe(
      'Tem o menor preço disponível em todos os 3 SKUs que compartilha com outra loja.',
    );
  });

  test('ties are not broken arbitrarily', () => {
    expect(
      overviewHeadline([store('A', 0.05), store('B', 0.05)], 2).title,
    ).toBe('A e B estão empatadas como as lojas mais baratas.');
    expect(
      overviewHeadline(
        [store('A', 0.05), store('B', 0.05), store('C', 0.05)],
        2,
      ).title,
    ).toBe('3 lojas estão empatadas como as mais baratas.');
  });

  test('nothing to compare', () => {
    const h = overviewHeadline([store('A', null)], 1);
    expect(h.title).toBe('Preços das lojas, lado a lado.');
    expect(h.lede).toContain('1 SKU na última coleta');
  });
});
