import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { latestRun, priceRow } from 'fixtures/prices';
import { buildMatrix } from 'utils/insights';
import { describe, expect, test, vi } from 'vitest';

import { PriceMatrix } from './PriceMatrix';

const cellFor = (sku: string, store: string) => {
  const table = screen.getByRole('table', { name: 'Price matrix' });
  const headers = within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent);
  const row = within(table)
    .getAllByRole('row')
    .find((r) => r.textContent?.includes(sku))!;
  return within(row).getAllByRole('cell')[headers.indexOf(store)];
};

describe('PriceMatrix', () => {
  test('prices, cheapest store, discount, unpurchasable and missing prices', () => {
    render(<PriceMatrix matrix={buildMatrix(latestRun)} />);
    const drogasil = cellFor('BABY', 'Drogasil');
    expect(drogasil).toHaveTextContent(/R\$\s21,99/);
    expect(drogasil).toHaveTextContent('−7%');
    expect(drogasil.className).toMatch(/cheapest/);
    expect(cellFor('LUMINOUS', 'Drogaria Venancio').className).toMatch(
      /cheapest/,
    );
    expect(cellFor('BABY', 'Farmácia Indiana').className).toMatch(
      /notPurchasable/,
    );
    const missing = cellFor('LUMINOUS', 'Farmácia Indiana');
    expect(missing).toHaveTextContent('NOT_LISTED');
    expect(missing).toHaveAttribute(
      'title',
      expect.stringContaining('store returned no product'),
    );
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
    expect(screen.getByText(/BABY/)).toBeInTheDocument();
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
