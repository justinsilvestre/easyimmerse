import type {
  ImportProgress,
  TableLayout,
  TablePreview,
} from "@easyimmerse/types";
import { BookOpen, FolderOpen, Globe } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import {
  FailedImportNotice,
  UnsupportedFileNotice,
} from "./DictionaryImportNotices.tsx";
import { DictionaryImportProgress } from "./DictionaryImportProgress.tsx";
import { DictionaryList } from "./DictionaryList.tsx";
import type { DictionaryItem } from "./dictionaryItem.ts";
import { RemoveDictionaryDialog } from "./RemoveDictionaryDialog.tsx";
import { TableColumnsDialog } from "./TableColumnsDialog.tsx";
import { useHeadingFocusAfterRemoval } from "./useHeadingFocusAfterRemoval.ts";

/**
 * The dictionaries settings: every dictionary the user has added, and the ways to add one.
 * The registry button, the checkboxes and the order arrows show only when their handlers are given.
 * Remove asks through `onRemove`; the question shows while `confirmingRemovalOf` is set.
 */
export function DictionariesView({
  dictionaries,
  removingIds = [],
  confirmingRemovalOf = null,
  isLoading = false,
  loadFailed = false,
  addingFile = null,
  importProgress = null,
  unsupportedFile,
  importFailure = null,
  pendingTable,
  onBack,
  onAddFromRegistry,
  onAddFromFile,
  onToggle,
  onMove,
  onRemove,
  onConfirmRemoval,
  onCancelRemoval,
  onDismissUnsupportedFile,
  onDismissImportFailure,
  onImportTable,
  onCancelTable,
}: {
  dictionaries: readonly DictionaryItem[];
  /** The dictionaries whose removal has been confirmed but is not yet done. */
  removingIds?: readonly string[];
  /** The dictionary the user is asked whether to remove, or null. */
  confirmingRemovalOf?: DictionaryItem | null;
  /** Whether the list has yet to arrive. */
  isLoading?: boolean;
  /** Whether the list could not be loaded, as when no server is connected. */
  loadFailed?: boolean;
  /** The file being added, until it is imported or fails. */
  addingFile?: string | null;
  /** What the import of `addingFile` has stored so far, once the server reports it. */
  importProgress?: ImportProgress | null;
  /** The file the user last tried to add in a format the app cannot read, until dismissed. */
  unsupportedFile: string | null;
  /** Why the last file could not be added for another reason, until dismissed. */
  importFailure?: string | null;
  /** The table file the user is adding, with its first rows and detected columns, until imported or cancelled. */
  pendingTable: { fileName: string; preview: TablePreview } | null;
  /** Leaves for wherever the dictionaries were opened from, such as Settings or a word's pop-up, so its button says only Back. */
  onBack: () => void;
  onAddFromRegistry?: () => void;
  onAddFromFile: () => void;
  onToggle?: (dictionaryId: string) => void;
  onMove?: (dictionaryId: string, direction: "up" | "down") => void;
  /** Asks whether to remove a dictionary. */
  onRemove: (dictionaryId: string) => void;
  onConfirmRemoval: (dictionaryId: string) => void;
  onCancelRemoval: () => void;
  onDismissUnsupportedFile: () => void;
  onDismissImportFailure: () => void;
  onImportTable: (layout: TableLayout) => void;
  onCancelTable: () => void;
}) {
  const headingRef = useHeadingFocusAfterRemoval(
    dictionaries.map(({ id }) => id),
    removingIds,
  );
  const isAdding = addingFile !== null;
  const addButtons = (
    <>
      {onAddFromRegistry && (
        <Button
          variant="primary"
          disabled={isAdding}
          onClick={onAddFromRegistry}
        >
          <Globe className="size-4" aria-hidden />
          Add from the registry
        </Button>
      )}
      <Button
        variant={onAddFromRegistry ? "secondary" : "primary"}
        disabled={isAdding}
        onClick={onAddFromFile}
      >
        <FolderOpen className="size-4" aria-hidden />
        Add from a file
      </Button>
    </>
  );
  return (
    <ScreenLayout onBack={onBack}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold focus:outline-none"
        >
          Dictionaries
        </h1>
        {dictionaries.length > 0 && (
          <div className="flex flex-wrap gap-2">{addButtons}</div>
        )}
      </div>
      {addingFile && (
        <DictionaryImportProgress
          fileName={addingFile}
          progress={importProgress}
        />
      )}
      {unsupportedFile && (
        <UnsupportedFileNotice
          fileName={unsupportedFile}
          onDismiss={onDismissUnsupportedFile}
        />
      )}
      {importFailure && (
        <FailedImportNotice
          message={importFailure}
          onDismiss={onDismissImportFailure}
        />
      )}
      {isLoading ? (
        <p role="status" className="text-sm text-fg-muted">
          Loading the dictionaries…
        </p>
      ) : loadFailed ? (
        <p role="alert" className="text-sm text-danger-fg">
          The dictionaries could not be loaded. They are kept by the easyImmerse
          server, so connect to one to use them.
        </p>
      ) : dictionaries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-8" />}
          title="No dictionaries yet"
          description="With a dictionary, you can look up the words in subtitles and texts, and the definitions on your flashcards are filled in for you."
          actions={addButtons}
        />
      ) : (
        <DictionaryList
          dictionaries={dictionaries}
          removingIds={removingIds}
          onToggle={onToggle}
          onMove={onMove}
          onRemove={onRemove}
        />
      )}
      {onMove && (
        <p className="text-xs text-fg-faint">
          When more than one dictionary is enabled for a language, the pop-up
          shows their entries in the order listed.
        </p>
      )}
      {confirmingRemovalOf && (
        <RemoveDictionaryDialog
          title={confirmingRemovalOf.title}
          onRemove={() => onConfirmRemoval(confirmingRemovalOf.id)}
          onCancel={onCancelRemoval}
        />
      )}
      {pendingTable && (
        <TableColumnsDialog
          fileName={pendingTable.fileName}
          preview={pendingTable.preview}
          onImport={onImportTable}
          onCancel={onCancelTable}
        />
      )}
    </ScreenLayout>
  );
}
