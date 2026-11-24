import { describe, expect, test } from 'vitest';

import { sqlString, toObjects } from './sql';

describe('sql helpers', () => {
  test('rows become objects keyed by column, nulls become empty strings', () => {
    expect(
      toObjects(
        ['ean', 'price_brl'],
        [
          ['1', '9.9'],
          ['2', null],
        ],
      ),
    ).toEqual([
      { ean: '1', price_brl: '9.9' },
      { ean: '2', price_brl: '' },
    ]);
  });

  test('string literals escape single quotes', () => {
    expect(sqlString("gh-1'; DROP")).toBe("'gh-1''; DROP'");
  });
});
