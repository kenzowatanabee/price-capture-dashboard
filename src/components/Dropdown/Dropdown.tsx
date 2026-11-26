import {
  type FC,
  type KeyboardEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { normalize } from 'utils/search';

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

/** Lists longer than this get a search box at the top. */
const SEARCH_FROM = 8;

/**
 * A styled replacement for the browser's select: a button that opens a list, with a search
 * box when the list is long. Keyboard: arrows move, Enter picks, Escape closes; without a
 * search box, a letter jumps to the next option starting with it.
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
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [query, setQuery] = useState('');

  const searchable = options.length > SEARCH_FROM;
  const shown = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return words.length
      ? options.filter((o) =>
          words.every((word) => normalize(o.label).includes(word)),
        )
      : options;
  }, [options, query]);

  const current = options.find((o) => o.value === value)?.label ?? value;

  const show = () => {
    setQuery('');
    setCursor(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const pick = (option: DropdownOption) => {
    close();
    if (option.value !== value) onChange(option.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      if (open) close();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return show();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      return setCursor((i) =>
        Math.max(0, Math.min(shown.length - 1, i + step)),
      );
    }
    const typing = e.target instanceof HTMLInputElement;
    if (open && (e.key === 'Enter' || (e.key === ' ' && !typing))) {
      e.preventDefault();
      if (shown[cursor]) pick(shown[cursor]);
      return;
    }
    if (open && !typing && e.key.length === 1) {
      const letter = e.key.toLowerCase();
      const starts = (o: DropdownOption) =>
        o.label.toLowerCase().startsWith(letter);
      const after = shown.findIndex((o, i) => i > cursor && starts(o));
      const first = shown.findIndex(starts);
      if (after >= 0 || first >= 0) setCursor(after >= 0 ? after : first);
    }
  };

  const activeId = open && shown[cursor] ? `${id}-${cursor}` : undefined;

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
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current}`}
        aria-activedescendant={searchable ? undefined : activeId}
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
        <div className={`${styles.popup} ${align === 'end' ? styles.end : ''}`}>
          {searchable && (
            <input
              type="text"
              className={styles.search}
              aria-label={`Buscar ${label}`}
              aria-controls={`${id}-list`}
              aria-activedescendant={activeId}
              placeholder="Digite para buscar"
              autoComplete="off"
              // the list just opened because the user asked for it, so typing can start at once
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={onKeyDown}
            />
          )}
          <ul
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            className={styles.list}
          >
            {shown.map((option, i) => (
              <li
                key={option.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={option.value === value}
                className={i === cursor ? styles.cursor : undefined}
                // keep focus where it is, so the list does not close before the click lands
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
            {!shown.length && (
              <li className={styles.none} role="presentation">
                Nenhum resultado para “{query.trim()}”.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
