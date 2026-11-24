import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { fakeDomo } from 'fixtures/prices';
import { Provider } from 'react-redux';
import { makeStore } from 'reducers';
import { afterEach, describe, expect, test, vi } from 'vitest';

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
  afterEach(() => vi.useRealTimers());

  test('header says how fresh the data is', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 20, 18, 0))); // 3 h after the fixture run
    renderApp();
    expect(await screen.findByText('Updated 3 h ago')).toBeInTheDocument();
  });

  test('a run older than 30 hours is flagged', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 23, 15, 0))); // 3 days later
    renderApp();
    expect(
      await screen.findByText('No new run for 3 days'),
    ).toBeInTheDocument();
  });

  test('loads the latest run and shows the overview', async () => {
    const domo = renderApp();
    expect(
      await screen.findByText(/Latest run: 2026-11-20 12:03/),
    ).toHaveTextContent('gh-1001-1');
    expect(
      screen.getByRole('region', { name: 'Price position' }),
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
    const summary = await screen.findByRole('list', { name: 'Price summary' });
    expect(within(summary).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('combobox', { name: 'SKU' })).toHaveValue(
      '7509546060781',
    );
    expect(
      domo.queries.filter((q) => q.where?.[0]?.column === 'ean'),
    ).toHaveLength(1);
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
      domo.queries.some((q) => q.where?.[0]?.equals === '7509546651040'),
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
