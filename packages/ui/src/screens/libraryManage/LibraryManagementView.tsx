import type { LibraryItem } from "@easyimmerse/types";
import { LibraryItemCard } from "../../components/libraryItemCard/LibraryItemCard.tsx";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { languageName } from "../../lib/formatting/languages.ts";
import type { LibraryListStatus } from "../../lib/library/LibraryListStatus.ts";
import {
  NewLibraryMediaForm,
  type NewLibraryMediaStatus,
} from "./NewLibraryMediaForm.tsx";

/**
 * The library management screen: the way to add media to the library, and every item of the library, published or not, with its status.
 * While the library has no items, adding media asks for its language, which becomes the library's;
 * once it has items, their language shows under the heading.
 */
export function LibraryManagementView({
  status,
  language,
  items,
  coverUrlOf,
  addStatus,
  onAddMedia,
  onEditItem,
  onBack,
}: {
  status: LibraryListStatus;
  /** The library's language, or null while it has none. */
  language: string | null;
  items: readonly LibraryItem[];
  coverUrlOf: (item: LibraryItem) => string | null;
  addStatus: NewLibraryMediaStatus;
  /** Adds media in the chosen language, or in the library's language for null, with the translation language given. */
  onAddMedia: (language: string | null, translationLanguage: string) => void;
  onEditItem: (itemId: string) => void;
  onBack: () => void;
}) {
  const isLanguageFixed = items.length > 0 && language !== null;
  return (
    <ScreenLayout onBack={onBack} backLabel="Library" wide>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Manage library</h1>
        {status === "ready" && isLanguageFixed && (
          <p className="text-sm text-fg-muted">
            For learners of {languageName(language)}.
          </p>
        )}
      </div>
      {status === "ready" && (
        <NewLibraryMediaForm
          status={addStatus}
          languageChoice={isLanguageFixed ? null : (language ?? "de")}
          onAddMedia={onAddMedia}
        />
      )}
      {status === "loading" && (
        <p role="status" className="text-sm text-fg-muted">
          Loading the library…
        </p>
      )}
      {status === "failed" && (
        <p role="alert">
          The library couldn't be loaded. Try again in a moment.
        </p>
      )}
      {status === "ready" && items.length === 0 && (
        <p className="text-sm text-fg-muted">The library has no items yet.</p>
      )}
      {items.length > 0 && (
        <ul
          aria-label="Library items"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <li key={item.id} className="flex">
              <LibraryItemCard
                item={item}
                coverUrl={coverUrlOf(item)}
                showsStatus
                onOpen={onEditItem}
              />
            </li>
          ))}
        </ul>
      )}
    </ScreenLayout>
  );
}
