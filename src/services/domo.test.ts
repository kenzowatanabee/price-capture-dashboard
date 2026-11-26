import { describe, expect, test } from 'vitest';

import { buildQuery } from './domo';

// The exact requests sent to Domo's data API (no network: .query() only builds the URL).
describe('data API queries', () => {
  test('select, order and limit', () => {
    expect(
      buildQuery({
        select: ['run_id', 'fetched_at'],
        orderBy: { column: 'fetched_at', direction: 'descending' },
        limit: 1,
      }).query('prices'),
    ).toBe(
      "/data/v2/prices?fields=run_id, fetched_at&orderby='fetched_at' descending&limit=1",
    );
  });

  test('group by: one row per combination of the columns', () => {
    expect(
      buildQuery({
        select: ['ean', 'BRAND'],
        groupBy: ['ean', 'BRAND'],
      }).query('fct_drugs_price_snapshots'),
    ).toBe(
      "/data/v2/fct_drugs_price_snapshots?fields=ean, BRAND&groupby='ean','BRAND'",
    );
  });

  test('equality filter', () => {
    expect(
      buildQuery({
        select: ['ean'],
        where: [{ column: 'run_id', equals: 'gh-1001-1' }],
      }).query('prices'),
    ).toBe(
      "/data/v2/prices?fields=ean&filter='run_id'%20%3D%3D%20%22gh-1001-1%22",
    );
  });

  test('filter plus ascending order', () => {
    expect(
      buildQuery({
        select: ['ean', 'store'],
        where: [{ column: 'ean', equals: '7509546060781' }],
        orderBy: { column: 'fetched_at', direction: 'ascending' },
      }).query('prices'),
    ).toBe(
      "/data/v2/prices?fields=ean, store&filter='ean'%20%3D%3D%20%227509546060781%22&orderby='fetched_at' ascending",
    );
  });
});
