import { render, screen, within } from '@testing-library/react';
import { priceRow } from 'fixtures/prices';
import { describe, expect, test } from 'vitest';

import { SellerTable } from './SellerTable';

const rows = [
  priceRow({
    store: 'Drogaria São Paulo',
    price: 9,
    sellerType: 'partner',
    seller: 'Duda Makeup',
    url: 'https://dsp.test/p/1',
  }),
  priceRow({ store: 'Drogasil', price: 21.99, sellerType: 'store' }),
  priceRow({
    store: 'Drogal',
    price: 19.5,
    sellerType: 'store',
    seller: 'Drogal',
    available: true,
  }),
  priceRow({
    store: 'Pague Menos',
    status: 'Not Found',
    price: null,
    code: 'NOT_LISTED',
    message: 'NOT_LISTED: x',
  }),
];

const bodyRows = () =>
  within(screen.getByRole('table', { name: 'Sellers in the latest run' }))
    .getAllByRole('row')
    .slice(1);

describe('SellerTable', () => {
  test('own offers first by price, then partners, then stores without a price', () => {
    render(<SellerTable rows={rows} />);
    expect(
      bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent),
    ).toEqual(['Drogal', 'Drogasil', 'Drogaria São Paulo', 'Pague Menos']);
  });

  test('names the seller and tags partners', () => {
    render(<SellerTable rows={rows} />);
    const [drogal, drogasil, dsp, pague] = bodyRows();
    expect(drogal).toHaveTextContent('Yes');
    expect(within(drogasil).getAllByRole('cell')[1]).toHaveTextContent(
      'Drogasil', // sold by the store itself, name not repeated in the data
    );
    expect(dsp).toHaveTextContent('Duda Makeup');
    expect(dsp).toHaveTextContent('Partner');
    expect(within(dsp).getByRole('link')).toHaveAttribute(
      'href',
      'https://dsp.test/p/1',
    );
    expect(pague).toHaveTextContent('Not listed');
  });
});
