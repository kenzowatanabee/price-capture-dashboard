import { render, screen, within } from '@testing-library/react';
import { latestRun } from 'fixtures/prices';
import { computeOverview, storeComparison } from 'utils/insights';
import { describe, expect, test } from 'vitest';

import { Overview } from './Overview';

const renderOverview = () =>
  render(
    <Overview
      overview={computeOverview(latestRun)}
      comparison={storeComparison(latestRun)}
    />,
  );

describe('Overview', () => {
  test('stat tiles, with status as icon + label', () => {
    renderOverview();
    expect(
      within(screen.getByRole('group', { name: 'Prices found' })).getByText(
        '88%',
      ),
    ).toBeInTheDocument();
    const purchasable = screen.getByRole('group', { name: 'Purchasable' });
    expect(purchasable).toHaveTextContent('80%');
    expect(purchasable).toHaveTextContent('1 listed but not purchasable');
    expect(screen.getByRole('group', { name: 'Errors' })).toHaveTextContent(
      'every store answered',
    );
  });

  test('price position ranks stores from cheapest, premium at the tip', () => {
    renderOverview();
    const rows = within(
      screen.getByRole('list', { name: /Average premium/ }),
    ).getAllByRole('listitem');
    // each row's accessible name starts with "<store>: <premium>"
    expect(
      rows.map((r) => r.getAttribute('aria-label')?.split(':')[0]),
    ).toEqual([
      'Drogaria Venancio',
      'Drogaria São Paulo',
      'Drogasil',
      'Farmácia Indiana',
    ]);
    expect(rows[0]).toHaveTextContent('+3.6%');
    expect(rows[0]).toHaveTextContent('Cheapest on 1 of 2 SKUs');
    expect(rows[3]).toHaveTextContent('No SKU it shares with another store');
  });

  test('coverage meters with problems as tags', () => {
    renderOverview();
    const meters = within(
      screen.getByRole('list', { name: 'Prices found per store' }),
    ).getAllByRole('listitem');
    const indiana = meters.find((m) =>
      m.textContent?.includes('Farmácia Indiana'),
    )!;
    expect(indiana).toHaveTextContent('1/2');
    expect(indiana).toHaveTextContent('1 not purchasable');
    expect(indiana).toHaveTextContent('NOT_LISTED 1');
    expect(within(indiana).getByRole('meter')).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
  });
});
