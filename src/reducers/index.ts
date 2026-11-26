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
import {
  domoQuery,
  PRICES_ALIAS,
  type QueryFn,
  SEGMENTS_ALIAS,
} from 'services/domo';

import PricesSlice, { type ThunkExtra } from './prices/slice';

const rootReducer = combineReducers({
  prices: PricesSlice,
  //-- reducerRef
});

const NO_SEGMENTS: QueryFn = async () => [];

/**
 * Builds a store. With no arguments it talks to Domo. Tests and stories pass a fake `query`;
 * unless they also pass a fake `segmentsQuery`, there is simply no segmentation.
 */
export const makeStore = (query?: QueryFn, segmentsQuery?: QueryFn) =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault({
        thunk: {
          extraArgument: {
            query: query ?? domoQuery(PRICES_ALIAS),
            segmentsQuery:
              segmentsQuery ??
              (query ? NO_SEGMENTS : domoQuery(SEGMENTS_ALIAS)),
          } satisfies ThunkExtra,
        },
      }),
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
