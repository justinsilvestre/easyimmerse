import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { formatLanguagePair, languageName } from "../projects/languages.ts";
import {
  type DictionaryItem,
  dictionaryFormatLabels,
} from "./dictionaryItem.ts";

/**
 * Lists dictionaries grouped by the language they are looked up in.
 * Within a language the order is the order their entries take in the pop-up, and the arrows change it.
 */
export function DictionaryList({
  dictionaries,
  onToggle,
  onMove,
  onRemove,
}: {
  dictionaries: readonly DictionaryItem[];
  onToggle: (dictionaryId: string) => void;
  /** Swaps the dictionary with its neighbour among the dictionaries of the same source language. */
  onMove: (dictionaryId: string, direction: "up" | "down") => void;
  onRemove: (dictionaryId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {groupByLanguage(dictionaries).map(([language, group]) => (
        <section
          key={language}
          aria-label={languageName(language)}
          className="flex flex-col gap-2"
        >
          <h2 className="text-sm font-medium text-fg-muted">
            {languageName(language)}
          </h2>
          <ol className="flex flex-col gap-1.5">
            {group.map((dictionary, index) => (
              <li
                key={dictionary.id}
                className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  aria-label={`Enable ${dictionary.title}`}
                  checked={dictionary.isEnabled}
                  onChange={() => onToggle(dictionary.id)}
                  className="size-4 accent-accent"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {dictionary.title}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {formatLanguagePair(
                      dictionary.sourceLanguage,
                      dictionary.targetLanguage,
                    )}
                    {" · "}
                    {dictionary.entry_count.toLocaleString("en")} entries
                  </span>
                </span>
                <Badge>{dictionaryFormatLabels[dictionary.format]}</Badge>
                {group.length > 1 && (
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

function groupByLanguage(
  dictionaries: readonly DictionaryItem[],
): [string, DictionaryItem[]][] {
  const groups = new Map<string, DictionaryItem[]>();
  for (const dictionary of dictionaries) {
    const group = groups.get(dictionary.sourceLanguage) ?? [];
    groups.set(dictionary.sourceLanguage, [...group, dictionary]);
  }
  return [...groups.entries()];
}
