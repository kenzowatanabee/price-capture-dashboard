import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { babyHistory, priceRow } from 'fixtures/prices';
import { initialSlots } from 'utils/colors';
import { shortDate } from 'utils/format';
import { buildHistory } from 'utils/insights';
import { describe, expect, test, vi } from 'vitest';

import { HistoryChart } from './HistoryChart';

const series = buildHistory(babyHistory);

describe('HistoryChart', () => {
  test('store list: cheapest first, with latest, lowest and highest', () => {
    render(<HistoryChart series={series} slots={initialSlots(['Drogasil'])} />);
    const rows = within(
      screen.getByRole('list', { name: 'Price summary' }),
    ).getAllByRole('button');
    const cells = (i: number) =>
      [...rows[i].querySelectorAll('span')].map((s) =>
        s.textContent?.replace(/\s/g, ' '),
      );
    expect(cells(0)).toEqual([
      '',
      'Drogasil',
      'R$ 21,99',
      'R$ 21,99',
      'R$ 23,69',
    ]);
    expect(cells(1)[1]).toBe('Drogaria Venancio');
    expect(rows[0]).toHaveAttribute('aria-pressed', 'true');
    expect(rows[1]).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking a store asks to toggle it; a full highlight set disables the others', async () => {
    const onToggle = vi.fn();
    const many = buildHistory([
      ...babyHistory,
      priceRow({ store: 'A', price: 20 }),
      priceRow({ store: 'B', price: 20.5 }),
    ]);
    const { rerender } = render(
      <HistoryChart
        series={many}
        slots={initialSlots(['Drogasil'])}
        onToggle={onToggle}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Drogaria Venancio/ }),
    );
    expect(onToggle).toHaveBeenCalledWith('Drogaria Venancio');

    rerender(
      <HistoryChart
        series={many}
        slots={initialSlots(['A', 'B', 'Drogasil'])}
        onToggle={onToggle}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Drogaria Venancio/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /^.*Drogasil/ })).toBeEnabled(); // can still be removed
    expect(screen.getByText(/Remove one to pick another/)).toBeInTheDocument();
  });

  test('table view lists every day, newest first', async () => {
    render(<HistoryChart series={series} slots={{}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Table' }));
    const rows = within(
      screen.getByRole('table', { name: 'Price history table' }),
    ).getAllByRole('row');
    expect(rows).toHaveLength(1 + 3);
    expect(rows[1]).toHaveTextContent('20 Nov');
    expect(rows[2]).toHaveTextContent('—'); // Venancio had no price on 19 Nov
  });

  test('a SKU without any price shows a message instead of an empty chart', () => {
    render(<HistoryChart series={buildHistory([])} slots={{}} />);
    expect(
      screen.getByText('No prices recorded for this SKU yet.'),
    ).toBeInTheDocument();
  });

  test('short dates', () => {
    expect(shortDate('2026-11-20')).toBe('20 Nov');
    expect(shortDate('weird')).toBe('weird');
  });
});
