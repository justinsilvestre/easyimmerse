import type { DictionaryFormatKind } from "@easyimmerse/types";
import { Check, Download } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";
import { SelectField } from "../components/SelectField.tsx";
import {
  formatLanguagePair,
  languageName,
  languageOptions,
} from "../projects/languages.ts";
import { dictionaryFormatLabels } from "./dictionaryItem.ts";

/** A dictionary offered by the easyImmerse registry. */
export type RegistryDictionary = {
  id: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  format: DictionaryFormatKind;
  sizeBytes: number;
  isInstalled: boolean;
};

/** Lists the dictionaries of the easyImmerse registry, filtered by language, with a button to add each one. */
export function DictionaryRegistryDialog({
  entries,
  languageFilter,
  onLanguageFilterChange,
  onInstall,
  onClose,
}: {
  entries: readonly RegistryDictionary[];
  /** Empty shows every language. */
  languageFilter: string;
  onLanguageFilterChange: (language: string) => void;
  onInstall: (dictionaryId: string) => void;
  onClose: () => void;
}) {
  const shown = entries.filter(
    (entry) => languageFilter === "" || entry.sourceLanguage === languageFilter,
  );
  return (
    <ModalDialog
      title="Add a dictionary from the registry"
      description="Free dictionaries checked to work with easyImmerse. Each one is downloaded once and kept on this device."
      onCancel={onClose}
    >
      <SelectField
        label="Language"
        options={[{ value: "", label: "All languages" }, ...languageOptions]}
        value={languageFilter}
        onChange={(event) => onLanguageFilterChange(event.target.value)}
      />
      <ul
        aria-label="Registry dictionaries"
        className="flex max-h-80 flex-col gap-1.5 overflow-y-auto"
      >
        {shown.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{entry.title}</span>
              <span className="text-xs text-fg-muted">
                {formatLanguagePair(entry.sourceLanguage, entry.targetLanguage)}
                {" · "}
                {formatSize(entry.sizeBytes)}
              </span>
            </span>
            <Badge>{dictionaryFormatLabels[entry.format]}</Badge>
            {entry.isInstalled ? (
              <Badge tone="success">
                <Check className="size-3" aria-hidden />
                Added
              </Badge>
            ) : (
              <Button size="sm" onClick={() => onInstall(entry.id)}>
                <Download className="size-3" aria-hidden />
                Add
              </Button>
            )}
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-6 text-center text-sm text-fg-muted">
            {languageFilter
              ? `No dictionaries for ${languageName(languageFilter)} yet.`
              : "The registry has no dictionaries yet."}
          </li>
        )}
      </ul>
    </ModalDialog>
  );
}

function formatSize(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;
}
