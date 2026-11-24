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
    <section className={styles.FilterBar} aria-label="Product filters">
      <div className={styles.fields}>
        {SEGMENT_FIELDS.map((field) => {
          const options = filterOptions(eans, byEan, filters, field.key);
          const value = filters[field.key] ?? '';
          return (
            <label key={field.key} className={styles.field}>
              <span>{field.label}</span>
              <select
                value={value}
                data-active={value ? true : undefined}
                disabled={!options.length && !value}
                onChange={(e) => onChange(field.key, e.target.value)}
              >
                <option value="">All</option>
                {/* keep a picked value selectable even if other filters now exclude it */}
                {value && !options.some((o) => o.value === value) && (
                  <option value={value}>{value} (0)</option>
                )}
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value} ({o.count})
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <div className={styles.summary}>
        <span aria-live="polite">
          {shown} of {eans.length} products
        </span>
        <button type="button" disabled={!active} onClick={onClear}>
          Clear filters
        </button>
      </div>
    </section>
  );
};
