import { AnchoredPopup } from "../lookup/AnchoredPopup.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import { lookupStateOf } from "../lookup/lookupStateOf.ts";
import type { PageLookupView } from "./createPageLookup.ts";

/**
 * The dictionary pop-up on a web page, at the word the view names, or nothing when the view is null.
 * It offers no flashcards, and shows no images from the dictionaries, whose addresses would carry the server's token into the page.
 * `theme` sets its colors; without it, they follow the element around it.
 * It sets its own font, since inside a shadow root it inherits none from the app's page styles.
 */
export function PageLookupPopup({
  view,
  theme,
  onSearch,
  onToggleSize,
  onClose,
}: {
  view: PageLookupView | null;
  theme?: "light" | "dark";
  onSearch: (term: string) => void;
  onToggleSize: () => void;
  onClose: () => void;
}) {
  if (view === null) return null;
  return (
    <div data-theme={theme} className="font-sans leading-normal">
      <AnchoredPopup anchor={{ rect: view.anchor }} size={view.size}>
        <DictionaryPopup
          state={lookupStateOf(view.term, view.outcome)}
          mode="word"
          size={view.size}
          resolveMediaUrl={noMediaUrl}
          onSearch={onSearch}
          onToggleSize={onToggleSize}
          onClose={onClose}
        />
      </AnchoredPopup>
    </div>
  );
}

const noMediaUrl = () => null;
