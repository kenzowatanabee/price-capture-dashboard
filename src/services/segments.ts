import type { DataRow, QueryFn } from './domo';

/** The segmentation fields, in the order they narrow a product down. */
export const SEGMENT_FIELDS = [
  { key: 'category', column: 'CATEGORY', label: 'Categoria' },
  { key: 'subCategory', column: 'SUB_CATEGORY', label: 'Subcategoria' },
  { key: 'supplier', column: 'SUPPLIER', label: 'Fornecedor' },
  { key: 'brand', column: 'BRAND', label: 'Marca' },
  { key: 'subBrand', column: 'SUB_BRAND', label: 'Submarca' }, // alias of SUB-BRAND
  { key: 'segment', column: 'SEGMENT', label: 'Segmento' },
  { key: 'subsegment', column: 'SUBSEGMENT', label: 'Subsegmento' },
] as const;

export type SegmentKey = (typeof SEGMENT_FIELDS)[number]['key'];

/** One product's segmentation; a field is '' when the dataset has no value for it. */
export type ProductSegments = { ean: string } & Record<SegmentKey, string>;

const text = (value: DataRow[string] | undefined): string =>
  value == null ? '' : String(value).trim();

export const toProductSegments = (row: DataRow): ProductSegments => {
  const product = { ean: text(row.ean) } as ProductSegments;
  for (const field of SEGMENT_FIELDS)
    product[field.key] = text(row[field.column]);
  return product;
};

/**
 * The segmentation of every product, one entry per EAN. The dataset repeats it on every price
 * row, so the query groups by the segmentation columns; if an EAN still comes back more than
 * once (its segmentation changed over time), the first row wins.
 */
export const fetchSegments = async (
  query: QueryFn,
): Promise<Record<string, ProductSegments>> => {
  const columns = ['ean', ...SEGMENT_FIELDS.map((f) => f.column)];
  const rows = await query({ select: columns, groupBy: columns });
  const byEan: Record<string, ProductSegments> = {};
  for (const row of rows) {
    const product = toProductSegments(row);
    if (product.ean && !(product.ean in byEan)) byEan[product.ean] = product;
  }
  return byEan;
};
