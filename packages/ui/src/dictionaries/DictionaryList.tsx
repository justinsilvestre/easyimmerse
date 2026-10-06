import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { languageName } from "../projects/languages.ts";
import {
  type DictionaryItem,
  describeDictionaryLanguages,
  dictionaryFormatLabels,
} from "./dictionaryItem.ts";
import { primarySubtag } from "./dictionaryLanguages.ts";

/**
 * Lists dictionaries grouped by the language they are looked up in, whatever the script or region, with those that do not state it last.
 * Within a language the order is the order their entries take in the pop-up.
 * The checkboxes and arrows show only when the caller can switch dictionaries off and reorder them.
 */
export function DictionaryList({
  dictionaries,
  onToggle,
  onMove,
  onRemove,
}: {
  dictionaries: readonly DictionaryItem[];
  onToggle?: (dictionaryId: string) => void;
  /** Swaps the dictionary with its neighbour among the dictionaries of the same source language. */
  onMove?: (dictionaryId: string, direction: "up" | "down") => void;
  onRemove: (dictionaryId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {groupByLanguage(dictionaries).map(([language, group]) => (
        <section
          key={language ?? ""}
          aria-label={groupName(language)}
          className="flex flex-col gap-2"
        >
          <h2 className="text-sm font-medium text-fg-muted">
            {groupName(language)}
          </h2>
          <ol className="flex flex-col gap-1.5">
            {group.map((dictionary, index) => (
              <li
                key={dictionary.id}
                className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              >
                {onToggle && (
                  <input
                    type="checkbox"
                    aria-label={`Enable ${dictionary.title}`}
                    checked={dictionary.isEnabled ?? true}
                    onChange={() => onToggle(dictionary.id)}
                    className="size-4 accent-accent"
                  />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {dictionary.title}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {details(dictionary)}
                  </span>
                </span>
                <Badge>{dictionaryFormatLabels[dictionary.format]}</Badge>
                {onMove && group.length > 1 && (
                  <span className="flex">
                    <IconButton
                      label={`Move ${dictionary.title} up`}
                      disabled={index === 0}
                      onClick={() => onMove(dictionary.id, "up")}
                    >
                      <ChevronUp className="size-4" />
                    </IconButton>
                    <IconButton
                      label={`Move ${dictionary.title} down`}
                      disabled={index === group.length - 1}
                      onClick={() => onMove(dictionary.id, "down")}
                    >
                      <ChevronDown className="size-4" />
                    </IconButton>
                  </span>
                )}
                <IconButton
                  label={`Remove ${dictionary.title}`}
                  onClick={() => onRemove(dictionary.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function groupName(language: string | null): string {
  return language === null ? "Language not stated" : languageName(language);
}

function details(dictionary: DictionaryItem): string {
  const entries = `${dictionary.entry_count.toLocaleString("en")} entries`;
  const languages = describeDictionaryLanguages(dictionary);
  return languages ? `${languages} · ${entries}` : entries;
}

function groupByLanguage(
  dictionaries: readonly DictionaryItem[],
): [string | null, DictionaryItem[]][] {
  const groups = new Map<string | null, DictionaryItem[]>();
  for (const dictionary of dictionaries) {
    const language =
      dictionary.source_language && primarySubtag(dictionary.source_language);
    groups.set(language, [...(groups.get(language) ?? []), dictionary]);
  }
  return [...groups.entries()].sort(
    ([first], [second]) => Number(first === null) - Number(second === null),
  );
}
