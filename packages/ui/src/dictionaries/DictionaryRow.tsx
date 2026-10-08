import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { IconButton } from "../components/IconButton.tsx";
import {
  type DictionaryItem,
  describeDictionaryLanguages,
  dictionaryFormatLabels,
} from "./dictionaryItem.ts";

/**
 * One dictionary in the list.
 * While it is being removed, the row says so and its controls are disabled.
 * The arrows show only when `onMove` is given and the dictionary has neighbours to swap with:
 * `position` is its place among the dictionaries of its language.
 */
export function DictionaryRow({
  dictionary,
  position,
  isRemoving,
  onToggle,
  onMove,
  onRemove,
}: {
  dictionary: DictionaryItem;
  position: { index: number; count: number };
  isRemoving: boolean;
  onToggle?: (dictionaryId: string) => void;
  onMove?: (dictionaryId: string, direction: "up" | "down") => void;
  onRemove: (dictionaryId: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 text-sm">
      {onToggle && (
        <input
          type="checkbox"
          aria-label={`Enable ${dictionary.title}`}
          checked={dictionary.isEnabled ?? true}
          disabled={isRemoving}
          onChange={() => onToggle(dictionary.id)}
          className="size-4 accent-accent"
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{dictionary.title}</span>
        <span className="text-xs text-fg-muted">{details(dictionary)}</span>
      </span>
      {isRemoving && (
        <span role="status" className="text-xs text-fg-muted">
          Removing…
        </span>
      )}
      <Badge>{dictionaryFormatLabels[dictionary.format]}</Badge>
      {onMove && position.count > 1 && (
        <span className="flex">
          <IconButton
            label={`Move ${dictionary.title} up`}
            disabled={isRemoving || position.index === 0}
            onClick={() => onMove(dictionary.id, "up")}
          >
            <ChevronUp className="size-4" />
          </IconButton>
          <IconButton
            label={`Move ${dictionary.title} down`}
            disabled={isRemoving || position.index === position.count - 1}
            onClick={() => onMove(dictionary.id, "down")}
          >
            <ChevronDown className="size-4" />
          </IconButton>
        </span>
      )}
      <IconButton
        label={`Remove ${dictionary.title}`}
        disabled={isRemoving}
        onClick={() => onRemove(dictionary.id)}
      >
        <Trash2 className="size-4" />
      </IconButton>
    </li>
  );
}

function details(dictionary: DictionaryItem): string {
  const entries = `${dictionary.entry_count.toLocaleString("en")} entries`;
  const languages = describeDictionaryLanguages(dictionary);
  return languages ? `${languages} · ${entries}` : entries;
}
