/** Which clicks on the app's own links the app takes in place of the platform. */
export type LinkClickScope =
  /** Only a plain click, so that the browser opens a link in a new tab or window for a modified or middle click. */
  | "plain"
  /** Every click, for a platform that has no other place to open a link, such as a side panel or a native window. */
  | "every";

/**
 * Builds a subscription to the clicks on the app's own links anywhere in the document, through one listener on the document.
 * For each click the app takes, it keeps the platform from loading the link and calls the listener with the link's path and query.
 * It leaves alone a link to another origin, and one with a `target` or `download` attribute.
 */
export function createSubscribeToLinkClicks(
  document: Document,
  scope: LinkClickScope,
): (listener: (path: string) => void) => () => void {
  const types = scope === "every" ? ["click", "auxclick"] : ["click"];
  return (listener) => {
    const handle = (event: Event) => {
      const path = takenPathOf(event as MouseEvent, document, scope);
      if (path === null) return;
      event.preventDefault();
      listener(path);
    };
    for (const type of types) document.addEventListener(type, handle);
    return () => {
      for (const type of types) document.removeEventListener(type, handle);
    };
  };
}

/** Returns the path and query of the app's own link that the click follows, when the app takes the click, or null. */
function takenPathOf(
  event: MouseEvent,
  document: Document,
  scope: LinkClickScope,
): string | null {
  if (scope === "plain" && !isPlainClick(event)) return null;
  const link = linkOf(event.target);
  if (link === null || link.hasAttribute("target")) return null;
  if (link.hasAttribute("download")) return null;
  const url = new URL(link.href);
  return url.origin === document.location.origin
    ? `${url.pathname}${url.search}`
    : null;
}

/** Tells whether the click is one of the main button without a modifier key, which follows a link where it is. */
function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function linkOf(target: EventTarget | null): HTMLAnchorElement | null {
  const element = target as Element | null;
  return element?.closest?.<HTMLAnchorElement>("a[href]") ?? null;
}
