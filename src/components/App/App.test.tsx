import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { fakeDomo } from 'fixtures/prices';
import { Provider } from 'react-redux';
import { makeStore } from 'reducers';
import { describe, expect, test } from 'vitest';

import { App } from './App';

const renderApp = (domo = fakeDomo()) => {
  render(
    <Provider store={makeStore(domo.query)}>
      <App />
    </Provider>,
  );
  return domo;
};

describe('App (with a fake Domo)', () => {
  test('loads the latest run and shows the overview', async () => {
    const domo = renderApp();
    expect(
      await screen.findByText(/Latest run: 2026-11-20 12:03:12/),
    ).toHaveTextContent('gh-1001-1');
    expect(
      screen.getByRole('table', { name: 'Store health' }),
    ).toBeInTheDocument();
    expect(domo.queries).toHaveLength(2); // latest run id, then that run's rows
  });

  test('matrix tab, then clicking a SKU opens its history', async () => {
    const domo = renderApp();
    await screen.findByText(/Latest run/);
    await userEvent.click(screen.getByRole('tab', { name: 'Price matrix' }));
    await userEvent.click(screen.getByRole('button', { name: /BABY/ }));
    expect(screen.getByRole('tab', { name: 'Price history' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const summary = await screen.findByRole('table', { name: 'Price summary' });
    expect(within(summary).getAllByRole('row')).toHaveLength(1 + 2);
    expect(screen.getByRole('combobox', { name: 'SKU' })).toHaveValue(
      '7509546060781',
    );
    expect(domo.queries.filter((q) => q.includes('WHERE ean'))).toHaveLength(1);
  });

  test('switching SKU in the history tab loads that SKU', async () => {
    const domo = renderApp();
    await screen.findByText(/Latest run/);
    await userEvent.click(screen.getByRole('tab', { name: 'Price history' }));
    await screen.findByRole('combobox', { name: 'SKU' });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'SKU' }),
      '7509546651040',
    );
    expect(
      await screen.findByText('No prices recorded for this SKU yet.'),
    ).toBeInTheDocument();
    expect(
      domo.queries.some((q) => q.includes("WHERE ean = '7509546651040'")),
    ).toBe(true);
  });

  test('a Domo failure shows the error and a retry', async () => {
    renderApp(fakeDomo({ fail: true }));
    expect(
      await screen.findByText(/Could not load prices: Domo is unreachable/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
