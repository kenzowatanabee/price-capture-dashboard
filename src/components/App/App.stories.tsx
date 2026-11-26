import type { Meta, StoryObj } from '@storybook/react';
import { fullRun, fullRunSegments } from 'fixtures/fullRun';
import { fakeDomo, fakeSegments } from 'fixtures/prices';
import { Provider } from 'react-redux';
import { makeStore } from 'reducers';

import { App } from './App';

const meta = {
  component: App,
  parameters: { layout: 'fullscreen' },
  title: 'App',
} satisfies Meta<typeof App>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The whole app against the sample data (no Domo needed). */
export const WithSampleData: Story = {
  decorators: [
    (story) => (
      <Provider store={makeStore(fakeDomo().query, fakeSegments())}>
        {story()}
      </Provider>
    ),
  ],
};

/** All ten tracked stores, to check that everything fits on one screen. */
export const TenStores: Story = {
  decorators: [
    (story) => (
      <Provider
        store={makeStore(
          fakeDomo({ run: fullRun }).query,
          fakeSegments(fullRunSegments),
        )}
      >
        {story()}
      </Provider>
    ),
  ],
};
