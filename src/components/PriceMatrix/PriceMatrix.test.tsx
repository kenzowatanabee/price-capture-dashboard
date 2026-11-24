import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { latestRun, priceRow } from 'fixtures/prices';
import { buildMatrix } from 'utils/insights';
import { describe, expect, test, vi } from 'vitest';

import { PriceMatrix } from './PriceMatrix';

const table = () => screen.getByRole('table', { name: 'Price matrix' });

const headers = () =>
  within(table())
    .getAllByRole('columnheader')
    .map((h) => h.textContent);

const cellFor = (sku: string, store: string) => {
  const row = within(table())
    .getAllByRole('row')
    .find((r) => r.textContent?.includes(sku))!;
  return within(row).getAllByRole('cell')[headers().indexOf(store)];
};

describe('PriceMatrix', () => {
  test('the lowest price is marked by text, others show their premium and tint step', () => {
    render(<PriceMatrix matrix={buildMatrix(latestRun)} />);
    const lowest = cellFor('LUMINOUS', 'Drogaria Venancio');
    expect(lowest).toHaveTextContent('▼ Lowest');
    expect(lowest).toHaveAttribute('data-step', '0');
    const dsp = cellFor('LUMINOUS', 'Drogaria São Paulo'); // 10.19 vs 8.99
    expect(dsp).toHaveTextContent('+13.3%');
    expect(dsp).toHaveAttribute('data-step', '2');
    expect(cellFor('LUMINOUS', 'Drogasil')).toHaveAttribute('data-step', '4'); // +70%
  });

  test('promotion, unpurchasable and missing prices', () => {
    render(<PriceMatrix matrix={buildMatrix(latestRun)} />);
    expect(cellFor('BABY', 'Drogasil')).toHaveTextContent('−7%');
    const indiana = cellFor('BABY', 'Farmácia Indiana');
    expect(indiana).toHaveTextContent('not purchasable');
    expect(indiana).not.toHaveAttribute('data-step');
    const missing = cellFor('LUMINOUS', 'Farmácia Indiana');
    expect(missing).toHaveTextContent('Not listed');
    expect(missing).toHaveAttribute(
      'title',
      expect.stringContaining('store returned no product'),
    );
  });

  test('store columns follow the given order, the rest alphabetically', () => {
    render(
      <PriceMatrix
        matrix={buildMatrix(latestRun)}
        storeOrder={['Drogaria Venancio', 'Drogasil']}
      />,
    );
    expect(headers()).toEqual([
      'SKU',
      'Drogaria Venancio',
      'Drogasil',
      'Drogaria São Paulo',
      'Farmácia Indiana',
      'Price gap',
    ]);
  });

  test('sort by biggest price gap', async () => {
    render(<PriceMatrix matrix={buildMatrix(latestRun)} />);
    await userEvent.click(screen.getByRole('button', { name: /^Sort SKUs:/ }));
    await userEvent.click(
      screen.getByRole('option', { name: /biggest price gap/ }),
    );
    const firstRow = within(table()).getAllByRole('row')[1];
    expect(firstRow).toHaveTextContent('LUMINOUS'); // 70% gap vs 7%
  });

  test('search filters by description or EAN', async () => {
    render(<PriceMatrix matrix={buildMatrix(latestRun)} />);
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search SKU' }),
      'luminous',
    );
    expect(screen.getByText('1 of 2 SKUs')).toBeInTheDocument();
    await userEvent.clear(
      screen.getByRole('searchbox', { name: 'Search SKU' }),
    );
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search SKU' }),
      '7509546060781',
    );
    expect(screen.getByText('1 of 2 SKUs')).toBeInTheDocument();
  });

  test('SKUs without any price are hidden by default and can be shown', async () => {
    const rows = [
      ...latestRun,
      priceRow({
        ean: '7891024000000',
        descSku: 'NOWHERE SKU',
        status: 'Not Found',
        price: null,
      }),
    ];
    render(<PriceMatrix matrix={buildMatrix(rows)} />);
    expect(screen.queryByText('NOWHERE SKU')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('checkbox', { name: /Hide SKUs without any price/ }),
    );
    expect(screen.getByText('NOWHERE SKU')).toBeInTheDocument();
  });

  test('clicking a SKU reports its EAN', async () => {
    const onSelectSku = vi.fn();
    render(
      <PriceMatrix matrix={buildMatrix(latestRun)} onSelectSku={onSelectSku} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /BABY/ }));
    expect(onSelectSku).toHaveBeenCalledWith('7509546060781');
  });
});

describe('PriceMatrix links to the store pages', () => {
  const rows = [
    priceRow({ store: 'A', price: 10, url: 'https://a.test/p/1' }),
    priceRow({ store: 'B', price: 12, url: '' }),
    priceRow({
      store: 'C',
      status: 'Not Found',
      price: null,
      code: 'OUT_OF_STOCK',
      message: 'OUT_OF_STOCK: x',
      url: 'https://c.test/p/1',
    }),
    priceRow({ store: 'D', price: 11, url: 'javascript:alert(1)' }),
  ];

  test('a price opens that store’s product page in a new tab', () => {
    render(<PriceMatrix matrix={buildMatrix(rows)} />);
    const link = screen.getByRole('link', { name: /^A: 10,00/ });
    expect(link).toHaveAttribute('href', 'https://a.test/p/1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  test('a missing price links too, so the reason can be checked', () => {
    render(<PriceMatrix matrix={buildMatrix(rows)} />);
    expect(screen.getAllByRole('link', { name: /^C:/ })[0]).toHaveAttribute(
      'href',
      'https://c.test/p/1',
    );
  });

  test('no link without a usable http(s) url', () => {
    render(<PriceMatrix matrix={buildMatrix(rows)} />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});

describe('PriceMatrix partner sellers', () => {
  test('a partner offer shows no price, only that the store has no offer of its own', () => {
    const rows = [
      priceRow({ store: 'A', price: 20, sellerType: 'store' }),
      priceRow({
        store: 'C',
        price: 9,
        sellerType: 'partner',
        seller: 'Duda Makeup',
      }),
    ];
    render(<PriceMatrix matrix={buildMatrix(rows)} />);
    const cell = cellFor('BABY', 'C');
    expect(cell).toHaveTextContent('Partner only');
    expect(cell).not.toHaveTextContent('9,00');
    expect(cell).not.toHaveAttribute('data-step');
    expect(cell).toHaveAttribute(
      'title',
      expect.stringContaining('Sold by a partner: Duda Makeup'),
    );
    expect(cellFor('BABY', 'A')).toHaveTextContent('▼ Lowest');
  });
});
