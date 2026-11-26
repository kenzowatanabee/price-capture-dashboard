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
    expect(await screen.findByText('Atualizado há 3 h')).toBeInTheDocument();
  });

  test('a run older than 30 hours is flagged', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 23, 15, 0))); // 3 days later
    renderApp();
    expect(
      await screen.findByText('Sem nova coleta há 3 dias'),
    ).toBeInTheDocument();
  });

  test('loads the latest run and shows the overview', async () => {
    const domo = renderApp();
    expect(
      await screen.findByText(/Última coleta: 20\/11\/2026 12:03/),
    ).toHaveTextContent('gh-1001-1');
    expect(
      screen.getByRole('region', { name: 'Posicionamento de preço' }),
    ).toBeInTheDocument();
    expect(domo.queries).toHaveLength(2); // latest run id, then that run's rows
  });

  test('matrix tab, then clicking a SKU opens its history', async () => {
    const domo = renderApp();
    await screen.findByText(/Última coleta/);
    await userEvent.click(
      screen.getByRole('tab', { name: 'Matriz de preços' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /BABY/ }));
    expect(
      screen.getByRole('tab', { name: 'Histórico de preços' }),
    ).toHaveAttribute('aria-selected', 'true');
    const summary = await screen.findByRole(
      'list',
      { name: 'Resumo de preços' },
      { timeout: 5000 }, // the chart is loaded on demand, which is slow when every test file runs at once
    );
    expect(within(summary).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Produto' })).toHaveTextContent(
      'EAN 7509546060781',
    );
    expect(
      domo.queries.filter((q) => q.where?.[0]?.column === 'ean'),
    ).toHaveLength(1);
  });

  test('switching SKU in the history tab loads that SKU', async () => {
    const domo = renderApp();
    await screen.findByText(/Última coleta/);
    await userEvent.click(
      screen.getByRole('tab', { name: 'Histórico de preços' }),
    );
    await userEvent.click(
      await screen.findByRole('combobox', { name: 'Buscar produto' }),
    );
    await userEvent.click(screen.getByRole('option', { name: /LUMINOUS/ }));
    expect(
      await screen.findByText('Nenhum preço registrado para este SKU ainda.'),
    ).toBeInTheDocument();
    expect(
      domo.queries.some((q) => q.where?.[0]?.equals === '7509546651040'),
    ).toBe(true);
  });

  test('a Domo failure shows the error and a retry', async () => {
    renderApp(fakeDomo({ fail: true }));
    expect(
      await screen.findByText(
        /Não foi possível carregar os preços: Domo is unreachable/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
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
    const bar = await screen.findByRole('region', {
      name: 'Filtros de produto',
    });
    expect(bar).toHaveTextContent('2 de 2 produtos');
    await userEvent.click(
      within(bar).getByRole('button', { name: /^Segmento:/ }),
    );
    await userEvent.click(within(bar).getByRole('option', { name: /Kids/ }));
    expect(bar).toHaveTextContent('1 de 2 produtos');
    expect(
      screen.getByRole('group', { name: 'SKUs × lojas' }),
    ).toHaveTextContent('1 × 4');

    await userEvent.click(screen.getByRole('tab', { name: 'Produtos' }));
    const cards = within(
      screen.getByRole('list', { name: 'Produtos' }),
    ).getAllByRole('button');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('BABY');
    expect(cards[0]).toHaveTextContent('Kids');

    await userEvent.click(
      screen.getByRole('button', { name: 'Limpar filtros' }),
    );
    expect(bar).toHaveTextContent('2 de 2 produtos');
  });

  test('options of the other fields follow the filter, with counts', async () => {
    renderWithSegments();
    const bar = await screen.findByRole('region', {
      name: 'Filtros de produto',
    });
    await userEvent.click(
      within(bar).getByRole('button', { name: /^Segmento:/ }),
    );
    await userEvent.click(
      within(bar).getByRole('option', { name: /Whitening/ }),
    );
    await userEvent.click(
      within(bar).getByRole('button', { name: /^Submarca:/ }),
    );
    expect(
      within(bar)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['✓Todos', 'Luminous White1']);
  });

  test('a product card opens that product’s history', async () => {
    renderWithSegments();
    await screen.findByRole('region', { name: 'Filtros de produto' });
    await userEvent.click(screen.getByRole('tab', { name: 'Produtos' }));
    await userEvent.click(screen.getByRole('button', { name: /BABY/ }));
    expect(
      screen.getByRole('tab', { name: 'Histórico de preços' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('without segmentation the app works and shows no filter bar', async () => {
    render(
      <Provider store={makeStore(fakeDomo().query)}>
        <App />
      </Provider>,
    );
    await screen.findByText(/Última coleta/);
    expect(
      screen.queryByRole('region', { name: 'Filtros de produto' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Produtos' })).toBeInTheDocument();
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
      await screen.findByText(/Filtros de produto indisponíveis/),
    ).toHaveTextContent('HTTP 400');
    expect(
      screen.getByRole('region', { name: 'Posicionamento de preço' }),
    ).toBeInTheDocument();
  });
});
