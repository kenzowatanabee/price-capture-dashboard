import {
  type ProductSegments,
  SEGMENT_FIELDS,
  type SegmentKey,
} from 'services/segments';

/** The value picked for each segmentation field; a field that is absent is not filtered. */
export type SegmentFilters = Partial<Record<SegmentKey, string>>;

export const activeFilters = (filters: SegmentFilters): SegmentKey[] =>
  SEGMENT_FIELDS.map((f) => f.key).filter((key) => !!filters[key]);

/** Does a product pass every filter (optionally ignoring one field)? */
export const matchesFilters = (
  product: ProductSegments | undefined,
  filters: SegmentFilters,
  ignore?: SegmentKey,
): boolean =>
  activeFilters(filters).every(
    (key) => key === ignore || product?.[key] === filters[key],
  );

/**
 * EANs to show. With no filter that is every EAN given; with filters, only products whose
 * segmentation matches (a product without segmentation cannot match a filter).
 */
export const filterEans = (
  eans: string[],
  byEan: Record<string, ProductSegments>,
  filters: SegmentFilters,
): Set<string> =>
  new Set(eans.filter((ean) => matchesFilters(byEan[ean], filters)));

export interface FilterOption {
  value: string;
  /** Products that would be shown if this value were picked. */
  count: number;
}

/**
 * The values offered for one field: those found among the products that pass the OTHER
 * filters, so every option leads somewhere and the counts say how many products it leaves.
 */
export const filterOptions = (
  eans: string[],
  byEan: Record<string, ProductSegments>,
  filters: SegmentFilters,
  key: SegmentKey,
): FilterOption[] => {
  const counts = new Map<string, number>();
  for (const ean of eans) {
    const product = byEan[ean];
    const value = product?.[key];
    if (value && matchesFilters(product, filters, key)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, 'pt-BR'));
};
