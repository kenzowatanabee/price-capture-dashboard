import { describe, expect, test } from 'vitest';

import { matchesSku } from './search';

const sku = {
  ean: '7509546061689',
  descSku: 'CREME DENTAL COLGATE TOTAL 12 CLEAN MINT 90g AÇÃO',
};

describe('matchesSku', () => {
  test.each(['', '  ', 'total', 'TOTAL 90g', '90g total', 'acao', '6061689'])(
    '%j matches',
    (query) => expect(matchesSku(sku, query)).toBe(true),
  );

  test.each(['luminous', 'total 70g', '999'])('%j does not match', (query) =>
    expect(matchesSku(sku, query)).toBe(false),
  );
});
