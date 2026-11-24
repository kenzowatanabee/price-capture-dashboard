import { formatPct } from './format';
import type { StoreComparison } from './insights';

export interface Headline {
  title: string;
  lede: string;
}

const skuCount = (n: number) => `${n} ${n === 1 ? 'SKU' : 'SKUs'}`;

/** The overview's headline: which store is cheapest in the latest run, in a sentence. */
export const overviewHeadline = (
  comparison: StoreComparison[],
  skus: number,
): Headline => {
  const ranked = comparison.filter((s) => s.avgPremium != null);
  if (!ranked.length) {
    return {
      title: 'Store prices, side by side.',
      lede: `${skuCount(skus)} in the latest run. No SKU has a purchasable price at two stores yet, so there is nothing to compare.`,
    };
  }
  const [first] = ranked;
  const leaders = ranked.filter((s) => s.avgPremium === first.avgPremium);
  if (leaders.length > 1) {
    return {
      title:
        leaders.length === 2
          ? `${leaders[0].store} and ${leaders[1].store} are tied as the cheapest stores.`
          : `${leaders.length} stores are tied as the cheapest.`,
      lede: `Each is ${formatPct(first.avgPremium, 1)} above the lowest purchasable offer on average.`,
    };
  }
  return {
    title: `${first.store} is the cheapest store right now.`,
    lede:
      first.avgPremium === 0
        ? `It has the lowest purchasable price on all ${skuCount(first.compared)} it shares with another store.`
        : `On average its prices are ${formatPct(first.avgPremium, 1)} above the lowest purchasable offer, and it is the cheapest on ${first.wins} of the ${skuCount(first.compared)} it shares with another store.`,
  };
};
