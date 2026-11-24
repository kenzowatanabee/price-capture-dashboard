/** A store page URL that is safe to link to: http(s) only, anything else is dropped. */
export const pageUrl = (url?: string | null): string | null =>
  url && /^https?:\/\//i.test(url) ? url : null;
