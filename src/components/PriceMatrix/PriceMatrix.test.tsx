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
    expect(dsp).toHaveTextContent('+13.3% vs lowest');
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
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Sort SKUs' }),
      'spread',
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
