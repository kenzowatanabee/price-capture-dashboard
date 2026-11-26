import type { HistorySeries } from './insights';

/**
 * Categorical slots in fixed order (dataviz reference palette, light mode; validated with
 * scripts/validate_palette.js against #ffffff). The history chart highlights at most
 * MAX_HIGHLIGHTED stores. Lines can sit next to any other line, so the set must pass the
 * validator's all-pairs check: only the first three slots do (slot 4, yellow, is too close
 * to orange for normal vision), hence three.
 */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a'];

/** De-emphasised (context) series. */
export const CONTEXT_COLOR = '#c3c2b7';

export const MAX_HIGHLIGHTED = SERIES_COLORS.length;

/** store -> slot index. A store keeps its slot while highlighted; new ones take the first free slot. */
export type SlotMap = Record<string, number>;

export const toggleHighlight = (slots: SlotMap, store: string): SlotMap => {
  if (store in slots) {
    const next = { ...slots };
    delete next[store];
    return next;
  }
  const used = new Set(Object.values(slots));
  const free = SERIES_COLORS.findIndex((_, i) => !used.has(i));
  return free === -1 ? slots : { ...slots, [store]: free };
};

/** Highlight these stores (in this order) from scratch. */
export const initialSlots = (stores: string[]): SlotMap =>
  stores
    .slice(0, MAX_HIGHLIGHTED)
    .reduce<SlotMap>((map, store) => toggleHighlight(map, store), {});

/** The cheapest stores at their latest price, up to the highlight limit. */
export const defaultSlots = (series: HistorySeries): SlotMap =>
  initialSlots(
    series.summary
      .filter((s) => s.latest != null)
      .sort((a, b) => (a.latest as number) - (b.latest as number))
      .slice(0, MAX_HIGHLIGHTED)
      .map((s) => s.store),
  );
