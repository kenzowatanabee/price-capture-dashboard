import { priceRow } from 'fixtures/prices';
import { describe, expect, test } from 'vitest';

import { PRICE_COLUMNS, toCsv } from './csv';

describe('toCsv', () => {
  test('semicolons, decimal commas and quoting, as Brazilian Excel expects', () => {
    const csv = toCsv(
      [{ name: 'Creme; "Total" 12', price: 12.5, ok: true, gap: null }],
      [
        { header: 'name', value: (r) => r.name },
        { header: 'price', value: (r) => r.price },
        { header: 'ok', value: (r) => r.ok },
        { header: 'gap', value: (r) => r.gap },
      ],
    );
    expect(csv).toBe('name;price;ok;gap\r\n"Creme; ""Total"" 12";12,5;true;');
  });

  test('price rows export with the dataset column names', () => {
    const [header, line] = toCsv(
      [
        priceRow({
          price: 21.99,
          sellerType: 'partner',
          seller: 'Duda Makeup',
        }),
      ],
      PRICE_COLUMNS,
    ).split('\r\n');
    expect(header.split(';').slice(0, 5)).toEqual([
      'ean',
      'desc_sku',
      'store',
      'status',
      'price_brl',
    ]);
    expect(line).toContain(';21,99;');
    expect(line).toContain(';Duda Makeup;partner;');
  });
});
