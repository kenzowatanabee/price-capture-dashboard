import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { fakeDomo, fakeSegments } from 'fixtures/prices';
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
    const summary = await screen.findByRole(
      'list',
      { name: 'Price summary' },
      { timeout: 5000 }, // the chart is loaded on demand, which is slow when every test file runs at once
    );
    expect(within(summary).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Product' })).toHaveTextContent(
      'EAN 7509546060781',
    );
    expect(
      domo.queries.filter((q) => q.where?.[0]?.column === 'ean'),
    ).toHaveLength(1);
  });

  test('switching SKU in the history tab loads that SKU', async () => {
    const domo = renderApp();
    await screen.findByText(/Latest run/);
    await userEvent.click(screen.getByRole('tab', { name: 'Price history' }));
    await userEvent.click(
      await screen.findByRole('combobox', { name: 'Find a product' }),
    );
    await userEvent.click(screen.getByRole('option', { name: /LUMINOUS/ }));
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

describe('App with product segmentation', () => {
  const renderWithSegments = () =>
    render(
      <Provider store={makeStore(fakeDomo().query, fakeSegments())}>
        <App />
      </Provider>,
    );

  test('a filter narrows every tab, and clearing restores it', async () => {
    renderWithSegments();
    const bar = await screen.findByRole('region', { name: 'Product filters' });
    expect(bar).toHaveTextContent('2 of 2 products');
    await userEvent.selectOptions(
      within(bar).getByRole('combobox', { name: 'Segment' }),
      'Kids',
    );
    expect(bar).toHaveTextContent('1 of 2 products');
    expect(
      screen.getByRole('group', { name: 'SKUs × stores' }),
    ).toHaveTextContent('1 × 4');

    await userEvent.click(screen.getByRole('tab', { name: 'Products' }));
    const cards = within(
      screen.getByRole('list', { name: 'Products' }),
    ).getAllByRole('button');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('BABY');
    expect(cards[0]).toHaveTextContent('Kids');

    await userEvent.click(
      screen.getByRole('button', { name: 'Clear filters' }),
    );
    expect(bar).toHaveTextContent('2 of 2 products');
  });

  test('options of the other fields follow the filter, with counts', async () => {
    renderWithSegments();
    const bar = await screen.findByRole('region', { name: 'Product filters' });
    await userEvent.selectOptions(
      within(bar).getByRole('combobox', { name: 'Segment' }),
      'Whitening',
    );
    const subBrand = within(bar).getByRole('combobox', { name: 'Sub-brand' });
    expect(
      within(subBrand)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['All', 'Luminous White (1)']);
  });

  test('a product card opens that product’s history', async () => {
    renderWithSegments();
    await screen.findByRole('region', { name: 'Product filters' });
    await userEvent.click(screen.getByRole('tab', { name: 'Products' }));
    await userEvent.click(screen.getByRole('button', { name: /BABY/ }));
    expect(screen.getByRole('tab', { name: 'Price history' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('without segmentation the app works and shows no filter bar', async () => {
    render(
      <Provider store={makeStore(fakeDomo().query)}>
        <App />
      </Provider>,
    );
    await screen.findByText(/Latest run/);
    expect(
      screen.queryByRole('region', { name: 'Product filters' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Products' })).toBeInTheDocument();
  });
});

describe('App when the segmentation fails to load', () => {
  test('prices still show, with a note that filters are unavailable', async () => {
    const failing = async () => {
      throw new Error('HTTP 400');
    };
    render(
      <Provider store={makeStore(fakeDomo().query, failing)}>
        <App />
      </Provider>,
    );
    expect(
      await screen.findByText(/Product filters are unavailable/),
    ).toHaveTextContent('HTTP 400');
    expect(
      screen.getByRole('region', { name: 'Price position' }),
    ).toBeInTheDocument();
  });
});
