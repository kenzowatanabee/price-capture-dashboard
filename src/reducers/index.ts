// WARNING: DO NOT DELETE ANY BOILERPLATE COMMENTS IN THIS FILE (start with //-- )
// IF YOU DO, GENERATED REDUCERS WILL NOT BE WIRED UP AUTOMATICALLY.

import {
  type Action,
  combineReducers,
  configureStore,
  type ThunkAction,
} from '@reduxjs/toolkit';
//-- importRef
import { useDispatch, useSelector } from 'react-redux';
import { domoQuery, PRICES_ALIAS, type QueryFn } from 'services/sql';

import PricesSlice, { type ThunkExtra } from './prices/slice';

const rootReducer = combineReducers({
  prices: PricesSlice,
  //-- reducerRef
});

/** Builds a store; tests pass a fake query instead of Domo's SQL API. */
export const makeStore = (query: QueryFn = domoQuery(PRICES_ALIAS)) =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: { query } satisfies ThunkExtra } }),
  });

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
export type AppDispatch = AppStore['dispatch'];
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
