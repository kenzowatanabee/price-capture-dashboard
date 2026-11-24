import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
class ResizeObserverStub {
  observe() {
    // nothing to observe in jsdom
  }
  unobserve() {
    // nothing to observe in jsdom
  }
  disconnect() {
    // nothing to observe in jsdom
  }
}
globalThis.ResizeObserver ??=
  ResizeObserverStub as unknown as typeof ResizeObserver;
