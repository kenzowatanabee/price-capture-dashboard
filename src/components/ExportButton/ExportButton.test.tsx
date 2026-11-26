import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { priceRow } from 'fixtures/prices';
import * as csv from 'utils/csv';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ExportButton } from './ExportButton';

describe('ExportButton', () => {
  afterEach(() => vi.restoreAllMocks());

  test('downloads the rows as a named CSV file', async () => {
    const download = vi
      .spyOn(csv, 'downloadCsv')
      .mockImplementation(() => undefined);
    render(<ExportButton rows={[priceRow()]} filename="price-matrix-run1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(download).toHaveBeenCalledWith(
      'price-matrix-run1.csv',
      expect.stringContaining('ean;desc_sku;store'),
    );
  });

  test('disabled when there is nothing to export', () => {
    render(<ExportButton rows={[]} filename="x" />);
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });
});
