import type { QueryFn } from 'services/domo';
import {
  fetchHistory,
  fetchLatestRunId,
  fetchRun,
  type PriceRow,
} from 'services/prices';

import { createAppSlice } from '../createAppSlice';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type Tab = 'overview' | 'matrix' | 'history';

/** Passed to every thunk as `extra`, so tests can swap Domo for a fake. */
export interface ThunkExtra {
  query: QueryFn;
}

interface State {
  tab: Tab;
  latest: {
    status: LoadStatus;
    runId: string | null;
    rows: PriceRow[];
    error: string | null;
  };
  history: {
    status: LoadStatus;
    ean: string | null;
    rows: PriceRow[];
    error: string | null;
  };
}

const initialState: State = {
  tab: 'overview',
  latest: { status: 'idle', runId: null, rows: [], error: null },
  history: { status: 'idle', ean: null, rows: [], error: null },
};

const message = (error: { message?: string }) =>
  error.message ?? 'Unknown error';

export const PricesSlice = createAppSlice({
  name: 'prices',
  initialState,
  reducers: (create) => ({
    setTab: create.reducer<Tab>((state, { payload }) => {
      state.tab = payload;
    }),

    // the most recent scraper run: its id and all of its rows
    loadLatestRun: create.asyncThunk(
      async (_: void, { extra }) => {
        const { query } = extra as ThunkExtra;
        const runId = await fetchLatestRunId(query);
        return { runId, rows: runId ? await fetchRun(query, runId) : [] };
      },
      {
        pending: (state) => {
          state.latest.status = 'loading';
          state.latest.error = null;
        },
        fulfilled: (state, { payload }) => {
          state.latest = {
            status: 'ready',
            runId: payload.runId,
            rows: payload.rows,
            error: null,
          };
        },
        rejected: (state, { error }) => {
          state.latest.status = 'error';
          state.latest.error = message(error);
        },
      },
    ),

    // every observation of one SKU, for the history chart
    loadHistory: create.asyncThunk(
      async (ean: string, { extra }) =>
        fetchHistory((extra as ThunkExtra).query, ean),
      {
        pending: (state, { meta }) => {
          state.history = {
            status: 'loading',
            ean: meta.arg,
            rows: [],
            error: null,
          };
        },
        fulfilled: (state, { payload, meta }) => {
          // ignore a slow answer for a SKU the user has already moved away from
          if (state.history.ean === meta.arg) {
            state.history.status = 'ready';
            state.history.rows = payload;
          }
        },
        rejected: (state, { error, meta }) => {
          if (state.history.ean === meta.arg) {
            state.history.status = 'error';
            state.history.error = message(error);
          }
        },
      },
    ),
  }),
  selectors: {
    selectTab: (state) => state.tab,
    selectLatest: (state) => state.latest,
    selectHistory: (state) => state.history,
  },
});

export const { setTab, loadLatestRun, loadHistory } = PricesSlice.actions;
export const { selectTab, selectLatest, selectHistory } = PricesSlice.selectors;

export default PricesSlice.reducer;
