import { Dropdown } from 'components/Dropdown/Dropdown';
import { type FC } from 'react';
import {
  type ProductSegments,
  SEGMENT_FIELDS,
  type SegmentKey,
} from 'services/segments';
import {
  activeFilters,
  filterOptions,
  type SegmentFilters,
} from 'utils/segments';

import styles from './FilterBar.module.scss';

export interface FilterBarProps {
  /** EANs of the latest run (the products that can be shown). */
  eans: string[];
  byEan: Record<string, ProductSegments>;
  filters: SegmentFilters;
  /** How many products pass the filters. */
  shown: number;
  onChange: (key: SegmentKey, value: string) => void;
  onClear: () => void;
}

/** One dropdown per segmentation field; the choice applies to every tab. */
export const FilterBar: FC<FilterBarProps> = ({
  eans,
  byEan,
  filters,
  shown,
  onChange,
  onClear,
}) => {
  const active = activeFilters(filters).length;
  return (
    <section className={styles.FilterBar} aria-label="Filtros de produto">
      <div className={styles.fields}>
        {SEGMENT_FIELDS.map((field, index) => {
          const options = filterOptions(eans, byEan, filters, field.key);
          const value = filters[field.key] ?? '';
          return (
            <Dropdown
              key={field.key}
              label={field.label}
              caption
              value={value}
              active={!!value}
              align={index >= SEGMENT_FIELDS.length - 2 ? 'end' : 'start'}
              disabled={!options.length && !value}
              onChange={(next) => onChange(field.key, next)}
              options={[
                { value: '', label: 'Todos' },
                // keep a picked value in the list even if other filters now exclude it
                ...(value && !options.some((o) => o.value === value)
                  ? [{ value, label: value, count: 0 }]
                  : []),
                ...options.map((o) => ({
                  value: o.value,
                  label: o.value,
                  count: o.count,
                })),
              ]}
            />
          );
        })}
      </div>
      <div className={styles.summary}>
        <span aria-live="polite">
          {shown} de {eans.length} produtos
        </span>
        <button type="button" disabled={!active} onClick={onClear}>
          Limpar filtros
        </button>
      </div>
    </section>
  );
};
