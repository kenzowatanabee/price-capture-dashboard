import type { Meta, StoryObj } from '@storybook/react';
import { latestRun } from 'fixtures/prices';
import { buildMatrix } from 'utils/insights';

import { PriceMatrix } from './PriceMatrix';

const meta = {
  component: PriceMatrix,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'PriceMatrix',
} satisfies Meta<typeof PriceMatrix>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LatestRun: Story = {
  args: { matrix: buildMatrix(latestRun) },
};
