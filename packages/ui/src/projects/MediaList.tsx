import { BookText, Captions, ChevronRight, Film, Music } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../components/Badge.tsx";
import { pluralize } from "../components/pluralize.ts";
import { formatTimestamp } from "../media/formatTimestamp.ts";

/** One media file of a project, as the project screen lists it. */
export type MediaItem = {
  id: string;
  name: string;
  kind: "video" | "audio" | "ebook";
  durationMs: number | null;
  /** Which timed text or text tracks the project has for this file. */
  timedText: readonly ("target" | "translation")[];
  flashcardCount: number;
};

const kindIcons: Record<MediaItem["kind"], ReactNode> = {
  video: <Film className="size-5" aria-label="Video" />,
  audio: <Music className="size-5" aria-label="Audio" />,
  ebook: <BookText className="size-5" aria-label="Ebook" />,
};

/** Lists a project's media files with their kind, subtitles, flashcards, and length. */
export function MediaList({
  media,
  onOpen,
}: {
  media: readonly MediaItem[];
  onOpen: (mediaId: string) => void;
}) {
  return (
    <ul aria-label="Media" className="flex flex-col gap-1.5">
      {media.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="group flex w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 text-left text-sm hover:border-line-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-fg-muted">{kindIcons[item.kind]}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="min-w-0 flex-1 truncate font-medium">
                {item.name}
              </span>
              <span className="flex items-center gap-3">
                <SubtitlesBadge timedText={item.timedText} />
                {item.flashcardCount > 0 && (
                  <span className="text-xs whitespace-nowrap text-fg-muted">
                    {pluralize(item.flashcardCount, "card")}
                  </span>
                )}
                {item.durationMs !== null && (
                  <span className="text-xs text-fg-faint tabular-nums sm:w-12 sm:text-right">
                    {formatTimestamp(item.durationMs)}
                  </span>
                )}
              </span>
            </span>
            <ChevronRight
              className="size-4 text-fg-faint group-hover:text-fg"
              aria-hidden
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

function SubtitlesBadge({ timedText }: { timedText: MediaItem["timedText"] }) {
  if (timedText.length === 0) return <Badge tone="warning">No subtitles</Badge>;
  return (
    <Badge tone={timedText.includes("target") ? "accent" : "neutral"}>
      <Captions className="size-3" aria-hidden />
      {timedText.includes("target") && timedText.includes("translation")
        ? "Dual subtitles"
        : timedText.includes("target")
          ? "Subtitles"
          : "Translation only"}
    </Badge>
  );
}
