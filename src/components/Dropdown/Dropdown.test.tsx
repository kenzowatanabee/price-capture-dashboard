import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { Dropdown } from './Dropdown';

const options = [
  { value: '', label: 'All' },
  { value: 'Kids', label: 'Kids', count: 3 },
  { value: 'Whitening', label: 'Whitening', count: 5 },
];

const setup = (value = '') => {
  const onChange = vi.fn();
  render(
    <Dropdown
      label="Segment"
      value={value}
      options={options}
      onChange={onChange}
    />,
  );
  return {
    onChange,
    trigger: screen.getByRole('button', { name: /^Segment:/ }),
  };
};

describe('Dropdown', () => {
  test('shows the current choice and opens a list with counts', async () => {
    const { trigger } = setup('Kids');
    expect(trigger).toHaveAccessibleName('Segment: Kids');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await userEvent.click(trigger);
    expect(screen.getByRole('option', { name: /Whitening/ })).toHaveTextContent(
      '5',
    );
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent(
      'Kids',
    );
  });

  test('clicking an option picks it and closes the list', async () => {
    const { onChange, trigger } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('option', { name: /Whitening/ }));
    expect(onChange).toHaveBeenCalledWith('Whitening');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('keyboard: arrows and Enter pick, a letter jumps, Escape closes', async () => {
    const { onChange, trigger } = setup();
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('Kids');
    await userEvent.keyboard('{ArrowDown}w{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('Whitening');
    await userEvent.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('closes when focus moves elsewhere, and re-picking the same value does nothing', async () => {
    const { onChange, trigger } = setup('Kids');
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('option', { name: /Kids/ }));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(trigger);
    await userEvent.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
