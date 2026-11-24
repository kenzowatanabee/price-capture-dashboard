import type { Meta, StoryObj } from '@storybook/react';
import { latestRun } from 'fixtures/prices';
import { computeOverview } from 'utils/insights';

import { Overview } from './Overview';

const meta = {
  component: Overview,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Overview',
} satisfies Meta<typeof Overview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LatestRun: Story = {
  args: { overview: computeOverview(latestRun) },
};
