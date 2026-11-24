import { type FC, type KeyboardEvent, useId, useRef, useState } from 'react';

import styles from './Dropdown.module.scss';

export interface DropdownOption {
  value: string;
  label: string;
  /** Shown at the right of the option, e.g. how many products it leaves. */
  count?: number;
}

export interface DropdownProps {
  /** What is being chosen; read by screen readers and shown above the field when `caption` is set. */
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Show the label as a small caption above the field. */
  caption?: boolean;
  /** Mark the field as narrowing the page (a value other than the default is picked). */
  active?: boolean;
  disabled?: boolean;
  /** Which edge of the field the list lines up with; use 'end' near the right of the page. */
  align?: 'start' | 'end';
}

/**
 * A styled replacement for the browser's select: a button that opens a list.
 * Keyboard: arrows move, Enter or Space picks, Escape closes, a letter jumps to the next
 * option starting with it.
 */
export const Dropdown: FC<DropdownProps> = ({
  label,
  value,
  options,
  onChange,
  caption = false,
  active = false,
  disabled = false,
  align = 'start',
}) => {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  const selected = options.find((o) => o.value === value);
  const current = selected?.label ?? value;

  const show = () => {
    setCursor(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const pick = (option: DropdownOption) => {
    setOpen(false);
    if (option.value !== value) onChange(option.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') return setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return show();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      return setCursor((i) =>
        Math.max(0, Math.min(options.length - 1, i + step)),
      );
    }
    if (open && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (options[cursor]) pick(options[cursor]);
      return;
    }
    if (open && e.key.length === 1) {
      const letter = e.key.toLowerCase();
      const after = options.findIndex(
        (o, i) => i > cursor && o.label.toLowerCase().startsWith(letter),
      );
      const first = options.findIndex((o) =>
        o.label.toLowerCase().startsWith(letter),
      );
      if (after >= 0 || first >= 0) setCursor(after >= 0 ? after : first);
    }
  };

  return (
    <div
      ref={root}
      className={styles.Dropdown}
      // close when focus leaves the whole control (click elsewhere, or Tab away)
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      {caption && (
        <span className={styles.caption} aria-hidden="true">
          {label}
        </span>
      )}
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current}`}
        aria-activedescendant={
          open && options[cursor] ? `${id}-${cursor}` : undefined
        }
        data-active={active || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span className={styles.value}>{current}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className={`${styles.list} ${align === 'end' ? styles.end : ''}`}
        >
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={option.value === value}
              className={i === cursor ? styles.cursor : undefined}
              // keep focus on the button, so the list does not close before the click lands
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setCursor(i)}
              onClick={() => pick(option)}
            >
              <span className={styles.check} aria-hidden="true">
                {option.value === value ? '✓' : ''}
              </span>
              <span className={styles.label}>{option.label}</span>
              {option.count != null && (
                <span className={styles.count}>{option.count}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
