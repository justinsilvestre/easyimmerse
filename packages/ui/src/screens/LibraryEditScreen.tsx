import {
  buildLibraryCoverUrl,
  buildLibraryFileUrl,
  useGetLibraryItemQuery,
  useGetLibraryTextQuery,
  useListLibraryItemsQuery,
} from "@easyimmerse/backend";
import { selectServerConfig } from "@easyimmerse/state";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { LibraryEditView } from "../library/LibraryEditView.tsx";
import { LibraryManagementView } from "../library/LibraryManagementView.tsx";
import { libraryManagementId } from "../library/libraryManagementId.ts";
import { useLibraryItemCreation } from "../library/useLibraryItemCreation.ts";
import { useLibraryItemEditing } from "../library/useLibraryItemEditing.ts";

/**
 * The library management screen, which only library managers reach: every item with the form for a new one,
 * or, for one item, its status, details, files and words.
 */
export function LibraryEditScreen({ itemId }: { itemId: string }) {
  return itemId === libraryManagementId ? (
    <LibraryManagementScreen />
  ) : (
    <LibraryItemEditScreen key={itemId} itemId={itemId} />
  );
}

function LibraryManagementScreen() {
  const go = useNavigate();
  const server = useAppSelector(selectServerConfig);
  const listing = useListLibraryItemsQuery();
  const edit = (itemId: string) => go({ type: "editLibraryItem", itemId });
  const creation = useLibraryItemCreation(edit);
  return (
    <LibraryManagementView
      status={listing.isError ? "failed" : listing.data ? "ready" : "loading"}
      items={listing.data?.items ?? []}
      coverUrlOf={(item) =>
        server && item.has_cover ? buildLibraryCoverUrl(server, item.id) : null
      }
      isCreating={creation.isCreating}
      createFailure={creation.failure}
      onCreate={creation.create}
      onEditItem={edit}
      onBack={() => go({ type: "openLibrary" })}
    />
  );
}

function LibraryItemEditScreen({ itemId }: { itemId: string }) {
  const go = useNavigate();
  const server = useAppSelector(selectServerConfig);
  const item = useGetLibraryItemQuery(itemId);
  const text = useGetLibraryTextQuery(itemId);
  const manage = () =>
    go({ type: "editLibraryItem", itemId: libraryManagementId });
  const editing = useLibraryItemEditing(itemId, manage);
  if (!item.data)
    return (
      <ScreenLayout onBack={manage} backLabel="Manage library">
        {item.isError ? (
          <p role="alert">This library item could not be loaded.</p>
        ) : (
          <p role="status" className="text-sm text-fg-muted">
            Loading the item…
          </p>
        )}
      </ScreenLayout>
    );
  return (
    <LibraryEditView
      item={item.data}
      text={text.data ?? null}
      previewUrl={
        server && item.data.file_name !== null
          ? buildLibraryFileUrl(server, itemId)
          : null
      }
      activity={editing.activity}
      onSave={editing.save}
      onReplaceFile={editing.replaceFile}
      onReplaceSubtitles={editing.replaceSubtitles}
      onSaveWords={editing.saveWords}
      onProposeWords={editing.proposeWords}
      onPublish={editing.publish}
      onUnpublish={editing.unpublish}
      onDelete={editing.remove}
      onBack={manage}
    />
  );
}
