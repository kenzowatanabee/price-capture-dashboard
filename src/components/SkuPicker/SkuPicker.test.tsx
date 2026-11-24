import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { SkuPicker } from './SkuPicker';

const skus = [
  { ean: '7509546060781', descSku: 'CREME DENTAL COLGATE BABY 50g' },
  { ean: '7509546651040', descSku: 'CREME DENTAL COLGATE LUMINOUS 70g' },
  { ean: '7509546074399', descSku: 'ENXAGUANTE BUCAL COLGATE PLAX 500ml' },
];

const setup = () => {
  const onSelect = vi.fn();
  render(
    <SkuPicker skus={skus} selected="7509546060781" onSelect={onSelect} />,
  );
  return {
    onSelect,
    input: screen.getByRole('combobox', { name: 'Find a product' }),
  };
};

describe('SkuPicker', () => {
  test('typing narrows the list by words in any order, or by EAN', async () => {
    const { input } = setup();
    await userEvent.type(input, '70g luminous');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.clear(input);
    await userEvent.type(input, '6074399');
    expect(screen.getByRole('option')).toHaveTextContent('PLAX');
  });

  test('clicking a product selects it and closes the list', async () => {
    const { onSelect, input } = setup();
    await userEvent.click(input);
    await userEvent.click(screen.getByRole('option', { name: /LUMINOUS/ }));
    expect(onSelect).toHaveBeenCalledWith('7509546651040');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  test('keyboard: arrows move, Enter selects, Escape closes', async () => {
    const { onSelect, input } = setup();
    await userEvent.type(input, 'colgate{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('7509546074399');
    await userEvent.type(input, 'x{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('marks the product being shown and says when nothing matches', async () => {
    const { input } = setup();
    await userEvent.click(input);
    const current = screen.getByRole('option', { selected: true });
    expect(within(current).getByText('Showing')).toBeInTheDocument();
    await userEvent.type(input, 'zzz');
    expect(screen.getByText(/No product matches/)).toBeInTheDocument();
  });
});
