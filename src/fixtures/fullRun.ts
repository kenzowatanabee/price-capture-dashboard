import type { PriceRow } from 'services/prices';

import { priceRow } from './prices';

/** The ten stores the scraper tracks today. */
export const TEN_STORES = [
  'Drogasil',
  'Droga Raia',
  'Drogaria São Paulo',
  'Drogarias Pacheco',
  'Pague Menos',
  'Farmácias São João',
  'Drogal',
  'Drogaria Venancio',
  'Drogaria Catarinense',
  'Farmácia Indiana',
];

const SKUS: [string, string, number][] = [
  ['7509546060781', 'CREME DENTAL COLGATE BABY SEM FLUOR 50g SINGLE', 21.99],
  ['7509546651040', 'CREME DENTAL COLGATE LUMINOUS WHITE CARVAO 70g', 9.99],
  ['7509546061689', 'CREME DENTAL COLGATE TOTAL 12 CLEAN MINT 90g', 12.49],
  ['7509546069593', 'CREME DENTAL COLGATE SENSITIVE PRO-ALIVIO 60g', 24.9],
  ['7509546074399', 'ENXAGUANTE BUCAL COLGATE PLAX ICE 500ml', 27.9],
  ['7509546080864', 'ESCOVA DENTAL COLGATE SLIM SOFT 2 UNIDADES', 32.5],
  ['7509546706207', 'CREME DENTAL COLGATE TRIPLA ACAO 90g LEVE 3', 13.99],
  ['7509546000012', 'FIO DENTAL COLGATE TOTAL 50m', 14.5],
  ['7509546000029', 'CREME DENTAL COLGATE NATURAL EXTRACTS 90g', 11.9],
  ['7509546000036', 'GEL DENTAL COLGATE KIDS MORANGO 50g', 8.75],
  ['7509546000043', 'ENXAGUANTE BUCAL COLGATE TOTAL 12 250ml', 19.9],
  ['7509546000050', 'ESCOVA DENTAL COLGATE 360 MEDIA', 17.25],
];

const SUB_CATEGORY = (name: string) =>
  name.startsWith('ENXAGUANTE')
    ? 'Mouthwash'
    : name.startsWith('ESCOVA')
      ? 'Toothbrush'
      : name.startsWith('FIO')
        ? 'Floss'
        : 'Toothpaste';

const SUB_BRAND = (name: string) =>
  [
    'TOTAL 12',
    'LUMINOUS WHITE',
    'SENSITIVE',
    'PLAX',
    'SLIM SOFT',
    'KIDS',
    'BABY',
    'NATURAL EXTRACTS',
    'TRIPLA ACAO',
    '360',
  ].find((s) => name.includes(s)) ?? '';

/** Made-up segmentation for the sample products. */
export const fullRunSegments = SKUS.map(([ean, name]) => ({
  ean,
  CATEGORY: 'Oral Care',
  SUB_CATEGORY: SUB_CATEGORY(name),
  SUPPLIER: 'Colgate-Palmolive',
  BRAND: 'Colgate',
  SUB_BRAND: SUB_BRAND(name),
  SEGMENT: /KIDS|BABY/.test(name)
    ? 'Kids'
    : /LUMINOUS/.test(name)
      ? 'Whitening'
      : /SENSITIVE/.test(name)
        ? 'Sensitivity'
        : 'Everyday',
  SUBSEGMENT: '',
}));

/** Small deterministic generator, so the sample looks the same on every run. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** One run across all ten stores: varied prices, promotions, and a few gaps. */
export const fullRun: PriceRow[] = (() => {
  const random = seeded(7);
  const rows: PriceRow[] = [];
  for (const [ean, descSku, base] of SKUS) {
    for (const store of TEN_STORES) {
      const roll = random();
      const price = Math.round(base * (0.92 + random() * 0.38) * 100) / 100;
      const promo = random() < 0.35;
      if (roll < 0.08) {
        rows.push(
          priceRow({
            ean,
            descSku,
            store,
            status: 'Not Found',
            price: null,
            listPrice: null,
            message: 'NOT_LISTED: store returned no product',
            code: 'NOT_LISTED',
          }),
        );
      } else {
        const blocked = roll < 0.13;
        const partner = roll > 0.93;
        rows.push(
          priceRow({
            ean,
            descSku,
            store,
            price,
            sellerType: partner ? 'partner' : 'store',
            seller: partner ? 'Duda Makeup' : store,
            // Placeholder host: Storybook shows the fallback tile for these.
            imageUrl: `https://example.invalid/${ean}.png`,
            url: `https://example.invalid/p/${ean}`,
            listPrice: promo ? Math.round(price * 1.12 * 100) / 100 : price,
            available: blocked ? false : true,
            message: blocked ? 'NOT_PURCHASABLE: cannotBeDelivered' : '',
            code: blocked ? 'NOT_PURCHASABLE' : null,
          }),
        );
        // some products also have a partner or two selling on the store's site
        const extras = random() < 0.25 ? (random() < 0.5 ? 2 : 1) : 0;
        for (let i = 0; i < extras; i += 1) {
          rows.push(
            priceRow({
              ean,
              descSku,
              store,
              price: Math.round(price * (1.05 + i * 0.12) * 100) / 100,
              listPrice: null,
              sellerType: 'partner',
              seller: i ? 'Viver Bem' : 'Sense',
              sellerId: i ? 'farmaviver' : 'sensefarma',
              mainOffer: false,
              url: `https://example.invalid/p/${ean}?s=${i}`,
            }),
          );
        }
      }
    }
  }
  return rows;
})();
