import type { LibraryItem } from "@easyimmerse/types";
import { FileText, Film, Music } from "lucide-react";
import {
  formatLibraryDuration,
  libraryDifficultyLabels,
  libraryKindLabels,
  libraryStatusLabels,
} from "../../lib/library/libraryLabels.ts";
import { Badge } from "../common/Badge.tsx";

const kindIcons = { video: Film, audio: Music, document: FileText };

const statusTones = {
  draft: "neutral",
  processing: "info",
  published: "success",
  failed: "danger",
} as const;

/**
 * One item of the library: its cover, title, kind, length, difficulty, tags, and the start of its description.
 * `showsStatus` adds the item's status, for library managers, who see items that are not published yet.
 */
export function LibraryItemCard({
  item,
  coverUrl,
  showsStatus = false,
  onOpen,
}: {
  item: LibraryItem;
  /** The image of the item's cover, or null when it has none to show. */
  coverUrl: string | null;
  showsStatus?: boolean;
  onOpen: (itemId: string) => void;
}) {
  const KindIcon = kindIcons[item.kind];
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface text-left hover:border-line-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="flex aspect-video w-full items-center justify-center bg-surface-muted text-fg-faint">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <KindIcon className="size-8" aria-hidden />
        )}
      </span>
      <span className="flex flex-col gap-2 px-4 py-3">
        <span className="flex items-start justify-between gap-2">
          <span className="font-medium">{item.title}</span>
          {showsStatus && (
            <Badge tone={statusTones[item.status.kind]}>
              {libraryStatusLabels[item.status.kind]}
            </Badge>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span className="flex items-center gap-1">
            <KindIcon className="size-3" aria-hidden />
            {libraryKindLabels[item.kind]}
          </span>
          {item.duration_ms !== null && (
            <span>{formatLibraryDuration(item.duration_ms)}</span>
          )}
          {item.difficulty && (
            <Badge tone="accent">
              {libraryDifficultyLabels[item.difficulty]}
            </Badge>
          )}
        </span>
        {item.description && (
          <span className="line-clamp-2 text-sm text-fg-muted">
            {item.description}
          </span>
        )}
        {item.tags.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}
