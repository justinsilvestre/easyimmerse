import type { LibraryWordPlace } from "@easyimmerse/state";
import type {
  LibraryEntry,
  LibraryItem,
  LibraryItemDraft,
  LibraryText,
  LibraryWord,
} from "@easyimmerse/types";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import {
  LibraryFilesSection,
  type LibrarySubtitleFiles,
} from "./LibraryFilesSection.tsx";
import { LibraryItemForm } from "./LibraryItemForm.tsx";
import { LibraryPublication } from "./LibraryPublication.tsx";
import { libraryLockOf } from "./libraryLock.ts";
import { SegmentWordsEditor } from "./SegmentWordsEditor.tsx";

/** What is under way on the library edit screen, and why the last change failed, or null. */
export type LibraryEditActivity = {
  isSaving: boolean;
  isUploading: boolean;
  isPublishing: boolean;
  failure: string | null;
};

/** The library manager's screen for one item: where it stands and how to publish it, its details, its files, and its words. */
export function LibraryEditView({
  item,
  text,
  previewUrl,
  activity,
  isConfirmingDelete,
  selectedWord,
  isOnlyUndefinedShown,
  onSave,
  onReplaceFile,
  onReplaceSubtitles,
  onSelectWord,
  onShowOnlyUndefined,
  onSaveWords,
  onApplyEverywhere,
  onProposeWords,
  onPublish,
  onUnpublish,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onBack,
}: {
  item: LibraryItem;
  /** The item's text, or null while it loads. */
  text: LibraryText | null;
  previewUrl: string | null;
  activity: LibraryEditActivity;
  isConfirmingDelete: boolean;
  selectedWord: LibraryWordPlace | null;
  isOnlyUndefinedShown: boolean;
  onSave: (draft: LibraryItemDraft) => void;
  onReplaceFile: (file: File) => void;
  onReplaceSubtitles: (files: LibrarySubtitleFiles) => void;
  onSelectWord: (place: LibraryWordPlace | null) => void;
  onShowOnlyUndefined: (isOn: boolean) => void;
  onSaveWords: (segmentIndex: number, words: LibraryWord[]) => Promise<boolean>;
  onApplyEverywhere: (text: string, entry: LibraryEntry) => Promise<boolean>;
  onProposeWords: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  return (
    <ScreenLayout onBack={onBack} backLabel="Manage library" wide>
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
      <LibraryItemForm
        key={item.id}
        item={item}
        previewUrl={previewUrl}
        isSaving={activity.isSaving}
        onSave={onSave}
      />
      <LibraryFilesSection
        item={item}
        isUploading={activity.isUploading}
        onReplaceFile={onReplaceFile}
        onReplaceSubtitles={onReplaceSubtitles}
      />
      {text ? (
        <SegmentWordsEditor
          segments={text.segments}
          languages={{
            target: item.language,
            translation: item.translation_language,
          }}
          lock={libraryLockOf(item.status)}
          selectedWord={selectedWord}
          isOnlyUndefinedShown={isOnlyUndefinedShown}
          onSelectWord={onSelectWord}
          onShowOnlyUndefined={onShowOnlyUndefined}
          onSaveWords={onSaveWords}
          onApplyEverywhere={onApplyEverywhere}
        />
      ) : (
        <p role="status" className="text-sm text-fg-muted">
          Loading the item's text…
        </p>
      )}
    </ScreenLayout>
  );
}
