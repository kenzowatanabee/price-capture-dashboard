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

describe('Dropdown with a long list', () => {
  const brands = [
    { value: '', label: 'All' },
    ...[
      'Colgate',
      'Sorriso',
      'Oral-B',
      'Close Up',
      'Sensodyne',
      'Listerine',
      'Elmex',
      'Curaprox',
      'São João',
    ].map((b) => ({ value: b, label: b })),
  ];
  const open = async () => {
    const onChange = vi.fn();
    render(
      <Dropdown label="Brand" value="" options={brands} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^Brand:/ }));
    return {
      onChange,
      search: screen.getByRole('textbox', { name: 'Search Brand' }),
    };
  };

  test('a search box appears, focused, and narrows the list (accents ignored)', async () => {
    const { search } = await open();
    expect(search).toHaveFocus();
    await userEvent.type(search, 'sao');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'São João',
    ]);
  });

  test('Enter picks the first match, and focus returns to the field', async () => {
    const { onChange, search } = await open();
    await userEvent.type(search, 'sens{Enter}');
    expect(onChange).toHaveBeenCalledWith('Sensodyne');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Brand:/ })).toHaveFocus();
  });

  test('says so when nothing matches, and Escape closes', async () => {
    const { search } = await open();
    await userEvent.type(search, 'zzz');
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('short lists get no search box', async () => {
    render(
      <Dropdown
        label="Segment"
        value=""
        options={brands.slice(0, 4)}
        onChange={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^Segment:/ }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
