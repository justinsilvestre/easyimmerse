import type {
  ImportProgress,
  TableLayout,
  TablePreview,
} from "@easyimmerse/types";
import { ArrowLeft, BookOpen, FolderOpen, Globe } from "lucide-react";
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
import { useRemovalConfirmation } from "./useRemovalConfirmation.ts";

/**
 * The dictionaries settings: every dictionary the user has added, and the ways to add one.
 * The registry button, the checkboxes and the order arrows show only when their handlers are given.
 * Removing a dictionary asks for confirmation before `onRemove` is called.
 */
export function DictionariesView({
  dictionaries,
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
  onDismissUnsupportedFile,
  onDismissImportFailure,
  onImportTable,
  onCancelTable,
}: {
  dictionaries: readonly DictionaryItem[];
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
  onBack: () => void;
  onAddFromRegistry?: () => void;
  onAddFromFile: () => void;
  onToggle?: (dictionaryId: string) => void;
  onMove?: (dictionaryId: string, direction: "up" | "down") => void;
  onRemove: (dictionaryId: string) => void;
  onDismissUnsupportedFile: () => void;
  onDismissImportFailure: () => void;
  onImportTable: (layout: TableLayout) => void;
  onCancelTable: () => void;
}) {
  const removal = useRemovalConfirmation(
    dictionaries.map(({ id }) => id),
    onRemove,
  );
  const removing = dictionaries.find(({ id }) => id === removal.askingId);
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
    <ScreenLayout
      headerActions={
        <Button variant="subtle" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          ref={removal.headingRef}
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
          onToggle={onToggle}
          onMove={onMove}
          onRemove={removal.ask}
        />
      )}
      {onMove && (
        <p className="text-xs text-fg-faint">
          When more than one dictionary is enabled for a language, the pop-up
          shows their entries in the order listed.
        </p>
      )}
      {removing && (
        <RemoveDictionaryDialog
          title={removing.title}
          onRemove={removal.confirm}
          onCancel={removal.cancel}
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
