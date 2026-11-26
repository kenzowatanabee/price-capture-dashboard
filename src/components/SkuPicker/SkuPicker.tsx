import { ProductThumb } from 'components/ProductThumb/ProductThumb';
import { type FC, type KeyboardEvent, useId, useMemo, useState } from 'react';
import { matchesSku } from 'utils/search';

import styles from './SkuPicker.module.scss';

export interface SkuOption {
  ean: string;
  descSku: string;
  imageUrl?: string | null;
}

export interface SkuPickerProps {
  skus: SkuOption[];
  /** EAN of the product currently shown; it is marked in the list. */
  selected?: string | null;
  onSelect: (ean: string) => void;
}

/** Type-to-search product picker: matches the description or the EAN, pictures in the list. */
export const SkuPicker: FC<SkuPickerProps> = ({ skus, selected, onSelect }) => {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const shown = useMemo(
    () => skus.filter((s) => matchesSku(s, query)),
    [skus, query],
  );

  const choose = (ean: string) => {
    onSelect(ean);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => Math.max(0, Math.min(shown.length - 1, i + step)));
    } else if (e.key === 'Enter' && open && shown[active]) {
      e.preventDefault();
      choose(shown[active].ean);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={styles.SkuPicker}>
      <input
        type="text"
        role="combobox"
        aria-label="Buscar produto"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && shown[active] ? `${listId}-${shown[active].ean}` : undefined
        }
        placeholder="Buscar produto por nome ou EAN"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id={listId} role="listbox" className={styles.list}>
          {shown.map((s, i) => (
            <li
              key={s.ean}
              id={`${listId}-${s.ean}`}
              role="option"
              aria-selected={s.ean === selected}
              className={i === active ? styles.active : undefined}
              // keep focus in the input, so the list does not close before the click lands
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(s.ean)}
            >
              <ProductThumb src={s.imageUrl} size={32} />
              <span className={styles.name}>
                {s.descSku}
                <span className={styles.ean}>{s.ean}</span>
              </span>
              {s.ean === selected && (
                <span className={styles.current}>Em exibição</span>
              )}
            </li>
          ))}
          {!shown.length && (
            <li className={styles.none} role="presentation">
              Nenhum produto corresponde a “{query.trim()}”.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
