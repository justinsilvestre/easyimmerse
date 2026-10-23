import type { BackendResult } from "@easyimmerse/backend";
import type { LookupQuery, LookupResponse } from "@easyimmerse/types";
import { createRoot } from "react-dom/client";
import { createPageLookup, type PageLookupView } from "./createPageLookup.ts";
import { PageLookupPopup } from "./PageLookupPopup.tsx";
import type { DetectLanguage } from "./pageLanguageOf.ts";
import { pageWordAtPoint } from "./pageWordAtPoint.ts";

type PageLookupMount = {
  /** The element inside a shadow root that the pop-up renders into. */
  container: Element;
  /** The element of the page that holds the shadow root, at which events from inside it are aimed. */
  host: Element;
  lookUp: (query: LookupQuery) => Promise<BackendResult<LookupResponse>>;
  detectLanguage: DetectLanguage;
};

const darkSchemeQuery = "(prefers-color-scheme: dark)";

/**
 * Starts the dictionary lookup of the web page: moving the mouse over a word while holding Shift opens the pop-up there,
 * or moves it there, and Escape closes it. The pop-up takes the system's light or dark theme.
 * Returns a function that stops the lookup and removes the pop-up.
 */
export function mountPageLookup({
  container,
  host,
  lookUp,
  detectLanguage,
}: PageLookupMount): () => void {
  const root = createRoot(container);
  const darkScheme = window.matchMedia(darkSchemeQuery);
  let shown: PageLookupView | null = null;
  const render = () =>
    root.render(
      <PageLookupPopup
        view={shown}
        theme={darkScheme.matches ? "dark" : "light"}
        onSearch={lookup.search}
        onToggleSize={lookup.toggleSize}
        onClose={lookup.close}
      />,
    );
  const lookup = createPageLookup({
    wordAt: (point) => pageWordAtPoint(point, detectLanguage),
    lookUp,
    show: (view) => {
      shown = view;
      render();
    },
  });
  const onPointerMove = (event: PointerEvent) => {
    // Moves over the pop-up reach the page aimed at its host.
    if (event.shiftKey && event.target !== host)
      void lookup.pointAt({ x: event.clientX, y: event.clientY });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") lookup.close();
  };
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("keydown", onKeyDown);
  darkScheme.addEventListener("change", render);
  return () => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("keydown", onKeyDown);
    darkScheme.removeEventListener("change", render);
    root.unmount();
  };
}
