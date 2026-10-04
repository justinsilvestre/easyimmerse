import type { DictionarySummary } from "@easyimmerse/types";
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
import { dictionaryFormatLabels } from "./dictionaryFormatLabels.ts";

/** The dictionaries settings: every dictionary the user has added, and the ways to add one. */
export function DictionariesView({
  dictionaries,
  unsupportedFile,
  onBack,
  onAddFromRegistry,
  onAddFromFile,
  onToggle,
  onMove,
  onRemove,
  onDismissUnsupportedFile,
}: {
  dictionaries: readonly DictionarySummary[];
  /** The file the user last tried to add in a format the app cannot read, until dismissed. */
  unsupportedFile: string | null;
  onBack: () => void;
  onAddFromRegistry: () => void;
  onAddFromFile: () => void;
  onToggle: (dictionaryId: string) => void;
  onMove: (dictionaryId: string, direction: "up" | "down") => void;
  onRemove: (dictionaryId: string) => void;
  onDismissUnsupportedFile: () => void;
}) {
  const addButtons = (
    <>
      <Button variant="primary" onClick={onAddFromRegistry}>
        <Globe className="size-4" aria-hidden />
        Add from the registry
      </Button>
      <Button onClick={onAddFromFile}>
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
        <h1 className="text-xl font-semibold">Dictionaries</h1>
        {dictionaries.length > 0 && (
          <div className="flex flex-wrap gap-2">{addButtons}</div>
        )}
      </div>
      {unsupportedFile && (
        <UnsupportedFileNotice
          fileName={unsupportedFile}
          onDismiss={onDismissUnsupportedFile}
        />
      )}
      {dictionaries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-8" />}
          title="No dictionaries yet"
          description="Dictionaries make words in subtitles and texts look-up-able, and fill in the definitions on your flashcards."
          actions={addButtons}
        />
      ) : (
        <DictionaryList
          dictionaries={dictionaries}
          onToggle={onToggle}
          onMove={onMove}
          onRemove={onRemove}
        />
      )}
      <p className="text-xs text-fg-faint">
        When more than one dictionary is enabled for a language, the pop-up
        shows their entries in the order listed.
      </p>
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
