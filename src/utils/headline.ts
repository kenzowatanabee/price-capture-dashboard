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
      title: 'Preços das lojas, lado a lado.',
      lede: `${skuCount(skus)} na última coleta. Nenhum SKU tem preço disponível em duas lojas ainda, então não há o que comparar.`,
    };
  }
  const [first] = ranked;
  const leaders = ranked.filter((s) => s.avgPremium === first.avgPremium);
  if (leaders.length > 1) {
    return {
      title:
        leaders.length === 2
          ? `${leaders[0].store} e ${leaders[1].store} estão empatadas como as lojas mais baratas.`
          : `${leaders.length} lojas estão empatadas como as mais baratas.`,
      lede: `Cada uma está, em média, ${formatPct(first.avgPremium, 1)} acima da menor oferta disponível.`,
    };
  }
  return {
    title: `${first.store} é a loja mais barata no momento.`,
    lede:
      first.avgPremium === 0
        ? `Tem o menor preço disponível em todos os ${skuCount(first.compared)} que compartilha com outra loja.`
        : `Em média, seus preços estão ${formatPct(first.avgPremium, 1)} acima da menor oferta disponível, e é a mais barata em ${first.wins} dos ${skuCount(first.compared)} que compartilha com outra loja.`,
  };
};
