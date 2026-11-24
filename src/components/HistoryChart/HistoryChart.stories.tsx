import type { Meta, StoryObj } from '@storybook/react';
import { babyHistory } from 'fixtures/prices';
import { buildHistory } from 'utils/insights';

import { HistoryChart } from './HistoryChart';

const meta = {
  component: HistoryChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'HistoryChart',
} satisfies Meta<typeof HistoryChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThreeDays: Story = {
  args: { series: buildHistory(babyHistory) },
};

export const NoPrices: Story = {
  args: { series: buildHistory([]) },
};
