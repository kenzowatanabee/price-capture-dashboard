import { render, screen, within } from '@testing-library/react';
import { babyHistory } from 'fixtures/prices';
import { buildHistory } from 'utils/insights';
import { describe, expect, test } from 'vitest';

import { HistoryChart } from './HistoryChart';

describe('HistoryChart', () => {
  test('summary table with latest, lowest and highest price per store', () => {
    render(<HistoryChart series={buildHistory(babyHistory)} />);
    const rows = within(
      screen.getByRole('table', { name: 'Price summary' }),
    ).getAllByRole('row');
    const drogasil = rows.find((r) => r.textContent?.includes('Drogasil'))!;
    const cells = within(drogasil)
      .getAllByRole('cell')
      .map((c) => c.textContent?.replace(/\s/g, ' '));
    expect(cells).toEqual(['Drogasil', 'R$ 21,99', 'R$ 21,99', 'R$ 23,69']);
  });

  test('a SKU without any price shows a message instead of an empty chart', () => {
    render(<HistoryChart series={buildHistory([])} />);
    expect(
      screen.getByText('No prices recorded for this SKU yet.'),
    ).toBeInTheDocument();
  });
});
