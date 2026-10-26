import { pathOfRoute } from "@easyimmerse/state";
import type {
  LibraryItem,
  LibraryItemDraft,
  LibraryText,
} from "@easyimmerse/types";
import { ScreenLayout } from "../../layout/ScreenLayout.tsx";
import { LibraryFilesSection } from "./LibraryFilesSection.tsx";
import { LibraryItemForm } from "./LibraryItemForm.tsx";
import { LibraryPublication } from "./LibraryPublication.tsx";
import { LibraryWordsSection } from "./LibraryWordsSection.tsx";

/** What is under way on the library edit screen, and why the last change failed, or null. */
export type LibraryEditActivity = {
  isSaving: boolean;
  isChangingCover: boolean;
  isUploading: boolean;
  isPublishing: boolean;
  isOpening: boolean;
  failure: string | null;
};

/**
 * The library manager's details page for one item: where it stands and how to publish it,
 * its words and the way to the player or the reader where they are chosen, its details, and its files.
 */
export function LibraryEditView({
  item,
  text,
  coverUrl,
  previewUrl,
  activity,
  isConfirmingDelete,
  onSave,
  onUploadCover,
  onChooseCoverFrame,
  onResetCover,
  onReplaceFile,
  onOpenWords,
  onProposeWords,
  onPublish,
  onUnpublish,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  item: LibraryItem;
  /** The item's text, or null while it loads. */
  text: LibraryText | null;
  coverUrl: string | null;
  previewUrl: string | null;
  activity: LibraryEditActivity;
  isConfirmingDelete: boolean;
  onSave: (draft: LibraryItemDraft) => void;
  onUploadCover: (file: File) => void;
  onChooseCoverFrame: (atMs: number) => void;
  onResetCover: () => void;
  /** Opens the file picker, to replace the item's file with one from this device. */
  onReplaceFile: () => void;
  /** Opens the item in the player or the reader, where its words are chosen. */
  onOpenWords: () => void;
  onProposeWords: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  return (
    <ScreenLayout
      backHref={pathOfRoute({ screen: "libraryManage" })}
      backLabel="Manage library"
      wide
    >
      <h1 className="text-xl font-semibold">{item.title}</h1>
      {activity.failure && (
        <p role="alert" className="text-sm text-danger-fg">
          {activity.failure}
        </p>
      )}
      <LibraryPublication
        item={item}
        isBusy={activity.isPublishing}
        onProposeWords={onProposeWords}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        isConfirmingDelete={isConfirmingDelete}
        onAskDelete={onAskDelete}
        onCancelDelete={onCancelDelete}
        onDelete={onDelete}
      />
      <LibraryWordsSection
        item={item}
        text={text}
        isOpening={activity.isOpening}
        onOpen={onOpenWords}
      />
      <LibraryItemForm
        key={item.id}
        item={item}
        coverUrl={coverUrl}
        previewUrl={previewUrl}
        isSaving={activity.isSaving}
        isChangingCover={activity.isChangingCover}
        onSave={onSave}
        onUploadCover={onUploadCover}
        onChooseCoverFrame={onChooseCoverFrame}
        onResetCover={onResetCover}
      />
      <LibraryFilesSection
        item={item}
        isUploading={activity.isUploading}
        onReplaceFile={onReplaceFile}
      />
    </ScreenLayout>
  );
}
