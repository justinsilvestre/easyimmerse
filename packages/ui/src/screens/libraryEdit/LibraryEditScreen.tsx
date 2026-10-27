import {
  buildLibraryCoverUrl,
  buildLibraryFileUrl,
  useGetLibraryItemQuery,
  useGetLibrarySettingsQuery,
  useGetLibraryTextQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import {
  actions,
  pathOfRoute,
  selectLibraryEdit,
  selectServerConfig,
} from "@easyimmerse/state";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { libraryProjectOf } from "../../lib/library/libraryProjectOf.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { LibraryEditView } from "./LibraryEditView.tsx";
import { useLibraryItemEditing } from "./useLibraryItemEditing.ts";

/**
 * The details page of one library item, which only library managers reach: its status, words, details and files.
 * Its words are chosen in the player or the reader, in the manager's library project for the library's language.
 */
export function LibraryEditScreen({ itemId }: { itemId: string }) {
  const go = useNavigate();
  const dispatch = useAppDispatch();
  const choices = useAppSelector(selectLibraryEdit);
  const server = useAppSelector(selectServerConfig);
  const item = useGetLibraryItemQuery(itemId);
  const text = useGetLibraryTextQuery(itemId);
  const projectList = useListProjectsQuery().data;
  const libraryLanguage = useGetLibrarySettingsQuery().data?.language;
  const manage = () => go({ type: "manageLibrary" });
  const editing = useLibraryItemEditing(
    itemId,
    `“${item.data?.title ?? ""}”`,
    manage,
  );
  if (!item.data)
    return (
      <ScreenLayout
        backHref={pathOfRoute({ screen: "libraryManage" })}
        backLabel="Manage library"
      >
        {item.isError ? (
          <p role="alert">
            This library item couldn't be loaded. Try again in a moment.
          </p>
        ) : (
          <p role="status" className="text-sm text-fg-muted">
            Loading the item…
          </p>
        )}
      </ScreenLayout>
    );
  const shown = item.data;
  return (
    <LibraryEditView
      item={shown}
      text={text.data ?? null}
      coverUrl={buildLibraryCoverUrl(server, item.data)}
      previewUrl={
        server && shown.file_name !== null
          ? buildLibraryFileUrl(server, itemId)
          : null
      }
      // Opening waits for the projects and the library's language, so that it finds the library project opened before.
      activity={{
        ...editing.activity,
        isOpening:
          editing.activity.isOpening ||
          projectList === undefined ||
          !libraryLanguage,
      }}
      isConfirmingDelete={
        choices.deletion?.kind === "item" && choices.deletion.itemId === itemId
      }
      onSave={editing.save}
      onUploadCover={editing.uploadCover}
      onChooseCoverFrame={editing.chooseCoverFrame}
      onResetCover={editing.resetCover}
      onReplaceFile={() => editing.replaceFile(shown.kind)}
      onOpenWords={() =>
        projectList &&
        libraryLanguage &&
        editing.openWords(
          libraryProjectOf(projectList.projects, libraryLanguage),
        )
      }
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
    />
  );
}
