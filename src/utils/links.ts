/** A store page URL that is safe to link to: http(s) only, anything else is dropped. */
export const pageUrl = (url?: string | null): string | null =>
  url && /^https?:\/\//i.test(url) ? url : null;

/** Is the app running inside another page's frame (as it does in Domo)? */
export const isEmbedded = (): boolean => window.parent !== window;

/**
 * Asks the Domo page around the app to open a URL in a new browser tab.
 *
 * Domo runs custom apps in a sandboxed frame where ordinary links to other sites do nothing,
 * so the app has to ask its parent instead. This is the message Domo's own `domo.navigate(url,
 * true)` sends (ryuu.js, services/navigation); it is sent directly to avoid loading that whole
 * library for one call.
 */
export const openThroughDomo = (url: string): void => {
  window.parent.postMessage(
    JSON.stringify({ event: 'navigate', url, isNewWindow: true }),
    '*',
  );
};
