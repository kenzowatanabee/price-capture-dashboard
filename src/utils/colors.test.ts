import { describe, expect, test } from 'vitest';

import {
  initialSlots,
  MAX_HIGHLIGHTED,
  SERIES_COLORS,
  toggleHighlight,
} from './colors';

describe('highlight colours', () => {
  test('stores take slots in order', () => {
    expect(initialSlots(['A', 'B', 'C'])).toEqual({ A: 0, B: 1, C: 2 });
  });

  test('removing a store never repaints the others; the freed slot is reused first', () => {
    const slots = initialSlots(['A', 'B', 'C']);
    const withoutB = toggleHighlight(slots, 'B');
    expect(withoutB).toEqual({ A: 0, C: 2 });
    expect(toggleHighlight(withoutB, 'D')).toEqual({ A: 0, C: 2, D: 1 });
  });

  test('at most one store per colour slot', () => {
    const full = initialSlots(['A', 'B', 'C', 'D', 'E']);
    expect(Object.keys(full)).toHaveLength(MAX_HIGHLIGHTED);
    expect(toggleHighlight(full, 'E')).toBe(full);
    expect(SERIES_COLORS).toHaveLength(3);
  });
});
