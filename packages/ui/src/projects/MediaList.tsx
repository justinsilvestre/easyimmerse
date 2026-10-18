import clsx from "clsx";
import { BookText, Film, Music, Trash2, TriangleAlert } from "lucide-react";
import { type ReactNode, useId } from "react";
import { MenuButton } from "../components/MenuButton.tsx";
import { pluralize } from "../components/pluralize.ts";
import { type MediaIssue, mediaIssueMessage } from "./mediaIssueMessage.ts";

/** One media file of a project, as the project screen lists it. */
export type MediaItem = {
  id: string;
  name: string;
  kind: "video" | "audio" | "ebook";
  flashcardCount: number;
  /** Why the file cannot be opened from this app, when something is known to stop it. */
  issue?: MediaIssue;
};

const kindIcons: Record<MediaItem["kind"], ReactNode> = {
  video: <Film className="size-5" aria-label="Video" />,
  audio: <Music className="size-5" aria-label="Audio" />,
  ebook: <BookText className="size-5" aria-label="Ebook" />,
};

/**
 * Lists a project's media files with their kind and flashcards. Each row opens the file and has a menu for removing it.
 * A file that cannot be opened from this app is marked with a warning giving the reason; its row still opens it, to show the full notice.
 */
export function MediaList({
  media,
  onOpen,
  onDelete,
}: {
  media: readonly MediaItem[];
  onOpen: (mediaId: string) => void;
  onDelete: (mediaId: string) => void;
}) {
  return (
    <ul aria-label="Media" className="flex flex-col gap-1.5">
      {media.map((item) => (
        <MediaRow
          key={item.id}
          item={item}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function MediaRow({
  item,
  onOpen,
  onDelete,
}: {
  item: MediaItem;
  onOpen: (mediaId: string) => void;
  onDelete: (mediaId: string) => void;
}) {
  const issueId = useId();
  const issueMessage = item.issue && mediaIssueMessage(item.issue, item.kind);
  return (
    <li className="flex items-center gap-1 rounded-md border border-line bg-surface pr-1 hover:border-line-strong">
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-describedby={issueMessage && issueId}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="text-fg-muted">{kindIcons[item.kind]}</span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={clsx(
              "min-w-0 truncate font-medium",
              issueMessage && "text-fg-muted",
            )}
          >
            {item.name}
          </span>
          {issueMessage && (
            <span
              title={issueMessage}
              aria-hidden
              className="shrink-0 text-warning-fg"
            >
              <TriangleAlert className="size-4" />
            </span>
          )}
        </span>
        {item.flashcardCount > 0 && (
          <span className="text-xs whitespace-nowrap text-fg-muted">
            {pluralize(item.flashcardCount, "card")}
          </span>
        )}
      </button>
      {issueMessage && (
        <span id={issueId} className="sr-only">
          {issueMessage}
        </span>
      )}
      <MenuButton
        label={`Actions for ${item.name}`}
        items={[
          {
            label: "Remove from project",
            icon: <Trash2 className="size-4" aria-hidden />,
            isDestructive: true,
            onSelect: () => onDelete(item.id),
          },
        ]}
      />
    </li>
  );
}
