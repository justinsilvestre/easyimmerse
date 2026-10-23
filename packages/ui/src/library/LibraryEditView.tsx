import type {
  LibraryItem,
  LibraryItemDraft,
  LibraryText,
} from "@easyimmerse/types";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import {
  LibraryFilesSection,
  type LibrarySubtitleFiles,
} from "./LibraryFilesSection.tsx";
import { LibraryItemForm } from "./LibraryItemForm.tsx";
import { LibraryPublication } from "./LibraryPublication.tsx";
import { SegmentWordsEditor } from "./SegmentWordsEditor.tsx";
import type { SegmentWords } from "./segmentWordEdits.ts";

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
  onSave,
  onReplaceFile,
  onReplaceSubtitles,
  onSaveWords,
  onProposeWords,
  onPublish,
  onUnpublish,
  onDelete,
  onBack,
}: {
  item: LibraryItem;
  /** The item's text, or null while it loads. */
  text: LibraryText | null;
  previewUrl: string | null;
  activity: LibraryEditActivity;
  onSave: (draft: LibraryItemDraft) => void;
  onReplaceFile: (file: File) => void;
  onReplaceSubtitles: (files: LibrarySubtitleFiles) => void;
  onSaveWords: (changes: SegmentWords[]) => void;
  onProposeWords: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const isLocked =
    item.status.kind !== "draft" && item.status.kind !== "failed";
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
          isLocked={isLocked}
          onSaveWords={onSaveWords}
        />
      ) : (
        <p role="status" className="text-sm text-fg-muted">
          Loading the item's text…
        </p>
      )}
    </ScreenLayout>
  );
}
