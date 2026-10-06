import type { TableLayout, TablePreview } from "@easyimmerse/types";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  FolderOpen,
  Globe,
  X,
} from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { DictionaryList } from "./DictionaryList.tsx";
import {
  type DictionaryItem,
  dictionaryFormatLabels,
} from "./dictionaryItem.ts";
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
  unsupportedFile,
  pendingTable,
  onBack,
  onAddFromRegistry,
  onAddFromFile,
  onToggle,
  onMove,
  onRemove,
  onDismissUnsupportedFile,
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
  /** The file the user last tried to add in a format the app cannot read, until dismissed. */
  unsupportedFile: string | null;
  /** The table file the user is adding, with its first rows and detected columns, until imported or cancelled. */
  pendingTable: { fileName: string; preview: TablePreview } | null;
  onBack: () => void;
  onAddFromRegistry?: () => void;
  onAddFromFile: () => void;
  onToggle?: (dictionaryId: string) => void;
  onMove?: (dictionaryId: string, direction: "up" | "down") => void;
  onRemove: (dictionaryId: string) => void;
  onDismissUnsupportedFile: () => void;
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
        <p role="status" className="text-sm text-fg-muted">
          Adding {addingFile}…
        </p>
      )}
      {unsupportedFile && (
        <UnsupportedFileNotice
          fileName={unsupportedFile}
          onDismiss={onDismissUnsupportedFile}
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

function UnsupportedFileNotice({
  fileName,
  onDismiss,
}: {
  fileName: string;
  onDismiss: () => void;
}) {
  const formats = Object.values(dictionaryFormatLabels).join(", ");
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-fg"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">
        <strong>{fileName}</strong> is not in a format the app can read.
        Supported formats: {formats}. A plugin may add support for others.
      </span>
      <IconButton label="Dismiss" onClick={onDismiss}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
}
