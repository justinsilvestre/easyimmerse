import {
  buildLibraryFileUrl,
  useGetLibraryItemQuery,
  useGetLibraryTextQuery,
} from "@easyimmerse/backend";
import { selectServerConfig } from "@easyimmerse/state";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { LibraryEditView } from "../library/LibraryEditView.tsx";
import { useLibraryItemEditing } from "../library/useLibraryItemEditing.ts";

/** The library management screen for one item, which only library managers reach: its status, details, files and words. */
export function LibraryEditScreen({ itemId }: { itemId: string }) {
  const go = useNavigate();
  const server = useAppSelector(selectServerConfig);
  const item = useGetLibraryItemQuery(itemId);
  const text = useGetLibraryTextQuery(itemId);
  const manage = () => go({ type: "manageLibrary" });
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
