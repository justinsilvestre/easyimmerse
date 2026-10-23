import clsx from "clsx";
import { AnchoredPopup } from "../lookup/AnchoredPopup.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { ResolveDictionaryMedia } from "../lookup/definition/definitionContext.ts";
import { lookupStateOf } from "../lookup/lookupStateOf.ts";
import type { PageLookupView } from "./createPageLookup.ts";

/**
 * The size of a rem, in CSS pixels, in the stylesheet of the page lookup:
 * the extension's build fixes it at the browser's default text size, whatever the root font size of the page.
 */
const pageRemPx = 16;

/**
 * The dictionary pop-up on a web page, at the word the view names, or nothing when the view is null.
 * It offers no flashcards. Images in definitions are found through `resolveMedia`.
 * While `isPassThrough`, the pointer passes through it to the page beneath, so that words it covers can be pointed at.
 * `theme` sets its colors; without it, they follow the element around it.
 * It sets its own font, since inside a shadow root it inherits none from the app's page styles.
 */
export function PageLookupPopup({
  view,
  theme,
  isPassThrough = false,
  resolveMedia,
  onSearch,
  onToggleSize,
  onClose,
}: {
  view: PageLookupView | null;
  theme?: "light" | "dark";
  isPassThrough?: boolean;
  resolveMedia: ResolveDictionaryMedia;
  onSearch: (term: string) => void;
  onToggleSize: () => void;
  onClose: () => void;
}) {
  if (view === null) return null;
  return (
    <div
      data-theme={theme}
      className={clsx(
        "font-sans leading-normal",
        isPassThrough && "**:pointer-events-none!",
      )}
    >
      <AnchoredPopup
        anchor={{ rect: view.anchor }}
        size={view.size}
        remPx={pageRemPx}
      >
        <DictionaryPopup
          state={lookupStateOf(view.term, view.outcome)}
          mode="word"
          size={view.size}
          remPx={pageRemPx}
          resolveMedia={resolveMedia}
          onSearch={onSearch}
          onToggleSize={onToggleSize}
          onClose={onClose}
        />
      </AnchoredPopup>
    </div>
  );
}
