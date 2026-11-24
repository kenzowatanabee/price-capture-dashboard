import type { ProductSegments } from 'services/segments';
import { describe, expect, test } from 'vitest';

import { filterEans, filterOptions } from './segments';

const product = (
  ean: string,
  brand: string,
  segment: string,
): ProductSegments => ({
  ean,
  category: 'Oral Care',
  subCategory: '',
  supplier: 'Colgate-Palmolive',
  brand,
  subBrand: '',
  segment,
  subsegment: '',
});

const byEan = Object.fromEntries(
  [
    product('1', 'Colgate', 'Toothpaste'),
    product('2', 'Colgate', 'Mouthwash'),
    product('3', 'Sorriso', 'Toothpaste'),
  ].map((p) => [p.ean, p]),
);
const eans = ['1', '2', '3', '4']; // 4 has no segmentation

describe('segment filters', () => {
  test('no filter shows everything, including products without segmentation', () => {
    expect([...filterEans(eans, byEan, {})]).toEqual(eans);
  });

  test('filters combine, and unsegmented products cannot match', () => {
    expect([...filterEans(eans, byEan, { brand: 'Colgate' })]).toEqual([
      '1',
      '2',
    ]);
    expect([
      ...filterEans(eans, byEan, { brand: 'Colgate', segment: 'Toothpaste' }),
    ]).toEqual(['1']);
  });

  test('options follow the other filters and carry counts', () => {
    expect(filterOptions(eans, byEan, { brand: 'Colgate' }, 'segment')).toEqual(
      [
        { value: 'Mouthwash', count: 1 },
        { value: 'Toothpaste', count: 1 },
      ],
    );
    // a field's own filter does not hide its other options
    expect(filterOptions(eans, byEan, { brand: 'Colgate' }, 'brand')).toEqual([
      { value: 'Colgate', count: 2 },
      { value: 'Sorriso', count: 1 },
    ]);
    // blank values are not offered
    expect(filterOptions(eans, byEan, {}, 'subBrand')).toEqual([]);
  });
});
