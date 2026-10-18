import { primarySubtag } from "@easyimmerse/state";
import { languageName } from "../projects/languages.ts";
import { DictionaryRow } from "./DictionaryRow.tsx";
import type { DictionaryItem } from "./dictionaryItem.ts";

/**
 * Lists dictionaries grouped by the language they are looked up in, whatever the script or region, with those that do not state it last.
 * Within a language the order is the order their entries take in the pop-up.
 * The checkboxes and arrows show only when the caller can switch dictionaries off and reorder them.
 * A dictionary whose id is in `removingIds` shows that it is being removed, and its controls are disabled.
 */
export function DictionaryList({
  dictionaries,
  removingIds = [],
  onToggle,
  onMove,
  onRemove,
}: {
  dictionaries: readonly DictionaryItem[];
  removingIds?: readonly string[];
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
              <DictionaryRow
                key={dictionary.id}
                dictionary={dictionary}
                position={{ index, count: group.length }}
                isRemoving={removingIds.includes(dictionary.id)}
                onToggle={onToggle}
                onMove={onMove}
                onRemove={onRemove}
              />
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
