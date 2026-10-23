import {
  buildLibraryFileUrl,
  useGetLibraryItemQuery,
  useGetLibraryTextQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectLibraryEdit,
  selectServerConfig,
} from "@easyimmerse/state";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { LibraryEditView } from "../library/LibraryEditView.tsx";
import { useLibraryItemEditing } from "../library/useLibraryItemEditing.ts";

/** The library management screen for one item, which only library managers reach: its status, details, files and words. */
export function LibraryEditScreen({ itemId }: { itemId: string }) {
  const go = useNavigate();
  const dispatch = useAppDispatch();
  const choices = useAppSelector(selectLibraryEdit);
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
      isConfirmingDelete={
        choices.deletion?.kind === "item" && choices.deletion.itemId === itemId
      }
      selectedWord={choices.selectedWord}
      isOnlyUndefinedShown={choices.isOnlyUndefinedShown}
      onSave={editing.save}
      onReplaceFile={editing.replaceFile}
      onReplaceSubtitles={editing.replaceSubtitles}
      onSelectWord={(place) => dispatch(actions.libraryWordSelected(place))}
      onShowOnlyUndefined={(isOn) =>
        dispatch(actions.libraryUndefinedFilterSet(isOn))
      }
      onSaveWords={editing.saveWords}
      onApplyEverywhere={editing.applyEverywhere}
      onProposeWords={editing.proposeWords}
      onPublish={editing.publish}
      onUnpublish={editing.unpublish}
      onAskDelete={() =>
        dispatch(actions.libraryDeletionAsked({ kind: "item", itemId }))
      }
      onCancelDelete={() => dispatch(actions.libraryDeletionAsked(null))}
      onDelete={() => {
        dispatch(actions.libraryDeletionAsked(null));
        editing.remove();
      }}
      onBack={manage}
    />
  );
}
