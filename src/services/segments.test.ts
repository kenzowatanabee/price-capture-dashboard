import { describe, expect, test } from 'vitest';

import type { DataQuery, DataRow } from './domo';
import { fetchSegments } from './segments';

describe('fetchSegments', () => {
  test('one entry per EAN, read through the manifest aliases', async () => {
    const queries: DataQuery[] = [];
    const byEan = await fetchSegments(async (q) => {
      queries.push(q);
      const rows: DataRow[] = [
        {
          ean: '1',
          CATEGORY: 'Oral Care',
          BRAND: 'Colgate',
          SUB_BRAND: ' Total 12 ',
          SEGMENT: null,
        },
        { ean: '1', CATEGORY: 'Changed later', BRAND: 'Colgate' },
        { ean: '', CATEGORY: 'No EAN' },
      ];
      return rows;
    });
    expect(queries[0].groupBy).toEqual(queries[0].select);
    expect(queries[0].select).toContain('SUB_BRAND');
    expect(Object.keys(byEan)).toEqual(['1']);
    expect(byEan['1']).toMatchObject({
      category: 'Oral Care',
      brand: 'Colgate',
      subBrand: 'Total 12',
      segment: '',
    });
  });
});
