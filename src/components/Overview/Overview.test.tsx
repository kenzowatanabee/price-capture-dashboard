import { render, screen, within } from '@testing-library/react';
import { latestRun } from 'fixtures/prices';
import { computeOverview } from 'utils/insights';
import { describe, expect, test } from 'vitest';

import { Overview } from './Overview';

describe('Overview', () => {
  test('shows the KPIs and one health row per store', () => {
    render(<Overview overview={computeOverview(latestRun)} />);
    expect(
      within(screen.getByRole('group', { name: 'Prices found' })).getByText(
        '88%',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Purchasable' })).getByText(
        '80%',
      ),
    ).toBeInTheDocument();
    const rows = within(
      screen.getByRole('table', { name: 'Store health' }),
    ).getAllByRole('row');
    expect(rows).toHaveLength(1 + 4);
    const indiana = rows.find((r) =>
      r.textContent?.includes('Farmácia Indiana'),
    )!;
    expect(indiana).toHaveTextContent('1/2 (50%)');
    expect(indiana).toHaveTextContent('0/1');
    expect(indiana).toHaveTextContent('NOT_LISTED (1)');
  });
});
