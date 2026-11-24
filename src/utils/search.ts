/** Lower case, without accents, so "sao joao" finds "São João". */
export const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export interface Searchable {
  ean: string;
  descSku: string;
}

/**
 * Does a SKU match what was typed? Every word must appear somewhere in the description or
 * the EAN, in any order ("total 90g" finds "CREME DENTAL COLGATE TOTAL 12 CLEAN MINT 90g").
 */
export const matchesSku = (sku: Searchable, query: string): boolean => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = `${normalize(sku.descSku)} ${sku.ean}`;
  return words.every((word) => haystack.includes(word));
};
