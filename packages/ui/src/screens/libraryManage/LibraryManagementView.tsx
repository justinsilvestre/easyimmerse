import type { LibraryItem } from "@easyimmerse/types";
import { LibraryItemCard } from "../../components/libraryItemCard/LibraryItemCard.tsx";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import type { LibraryListStatus } from "../../lib/library/LibraryListStatus.ts";
import {
  NewLibraryMediaForm,
  type NewLibraryMediaLanguages,
  type NewLibraryMediaStatus,
} from "./NewLibraryMediaForm.tsx";

/** The library management screen: the way to add media to the library, and every item of the library, published or not, with its status. */
export function LibraryManagementView({
  status,
  items,
  coverUrlOf,
  addStatus,
  onAddMedia,
  onEditItem,
  onBack,
}: {
  status: LibraryListStatus;
  items: readonly LibraryItem[];
  coverUrlOf: (item: LibraryItem) => string | null;
  addStatus: NewLibraryMediaStatus;
  onAddMedia: (languages: NewLibraryMediaLanguages) => void;
  onEditItem: (itemId: string) => void;
  onBack: () => void;
}) {
  return (
    <ScreenLayout onBack={onBack} backLabel="Library" wide>
      <h1 className="text-xl font-semibold">Manage library</h1>
      <NewLibraryMediaForm status={addStatus} onAddMedia={onAddMedia} />
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
