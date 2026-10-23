import type { BackendResult } from "@easyimmerse/backend";
import type { LookupQuery, LookupResponse } from "@easyimmerse/types";
import { createRoot } from "react-dom/client";
import { createPageLookup, type PageLookupView } from "./createPageLookup.ts";
import { PageLookupPopup } from "./PageLookupPopup.tsx";
import type { DetectLanguage } from "./pageLanguageOf.ts";
import { createPageMedia } from "./pageMedia.ts";
import { pageWordAtPoint } from "./pageWordAtPoint.ts";

type PageLookupMount = {
  /** The element inside a shadow root that the pop-up renders into. */
  container: Element;
  /** The element of the page that holds the shadow root, at which events from inside it are aimed. */
  host: Element;
  lookUp: (query: LookupQuery) => Promise<BackendResult<LookupResponse>>;
  /** Fetches a file stored with a dictionary, such as an image, or resolves with null when it cannot. */
  fetchMedia: (dictionaryId: string, path: string) => Promise<Blob | null>;
  detectLanguage: DetectLanguage;
};

/** The styles of the shadow root's host, which keep the pop-up above everything on the page. */
export const pageLookupHostCss =
  ":host { position: fixed !important; top: 0 !important; left: 0 !important; z-index: 2147483647 !important; }";

const darkSchemeQuery = "(prefers-color-scheme: dark)";

/**
 * Starts the dictionary lookup of the web page: moving the mouse over a word while holding Shift opens the pop-up there,
 * or moves it there, even over words the pop-up covers, which lets the pointer through while Shift is held.
 * The pop-up follows its word as the page or any part of it scrolls, and Escape closes it.
 * It takes the system's light or dark theme. Returns a function that stops the lookup and removes the pop-up.
 */
export function mountPageLookup({
  container,
  host,
  lookUp,
  fetchMedia,
  detectLanguage,
}: PageLookupMount): () => void {
  const root = createRoot(container);
  const darkScheme = window.matchMedia(darkSchemeQuery);
  let shown: PageLookupView | null = null;
  let isShiftHeld = false;
  const render = () =>
    root.render(
      <PageLookupPopup
        view={shown}
        theme={darkScheme.matches ? "dark" : "light"}
        isPassThrough={isShiftHeld}
        resolveMedia={media.resolver()}
        onSearch={lookup.search}
        onToggleSize={lookup.toggleSize}
        onClose={lookup.close}
      />,
    );
  const media = createPageMedia({ fetchMedia, onLoad: render });
  const lookup = createPageLookup({
    wordAt: (point) => pageWordAtPoint(point, detectLanguage),
    lookUp,
    show: (view) => {
      // Files belong to the entries they were fetched for, which a new outcome replaces.
      if (view?.outcome !== shown?.outcome) media.forget();
      shown = view;
      render();
    },
  });
  const holdShift = (isHeld: boolean) => {
    if (isHeld === isShiftHeld) return;
    isShiftHeld = isHeld;
    render();
  };
  const onPointerMove = (event: PointerEvent) => {
    holdShift(event.shiftKey);
    // Moves over the pop-up, while it does not let the pointer through, reach the page aimed at its host.
    if (event.shiftKey && event.target !== host)
      void lookup.pointAt({ x: event.clientX, y: event.clientY });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Shift") holdShift(true);
    if (event.key === "Escape") lookup.close();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Shift") holdShift(false);
  };
  const onBlur = () => holdShift(false);
  const reanchor = () =>
    lookup.reanchor({ width: window.innerWidth, height: window.innerHeight });
  const listeners = [
    listen(document, "pointermove", onPointerMove),
    listen(document, "keydown", onKeyDown),
    listen(document, "keyup", onKeyUp),
    listen(window, "blur", onBlur),
    // Scroll events do not bubble, so scrolls of the page's inner scroll containers are caught as they set out.
    listen(document, "scroll", reanchor, { capture: true, passive: true }),
    listen(window, "resize", reanchor),
    listen(darkScheme, "change", render),
  ];
  return () => {
    for (const stopListening of listeners) stopListening();
    media.forget();
    root.unmount();
  };
}

/** Adds an event listener, and returns a function that removes it. */
function listen<Event_ extends Event>(
  target: EventTarget,
  type: string,
  listener: (event: Event_) => void,
  options?: AddEventListenerOptions,
): () => void {
  const handler = listener as EventListener;
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}
