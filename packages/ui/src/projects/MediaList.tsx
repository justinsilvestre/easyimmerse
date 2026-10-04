import { BookText, Film, Music, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { MenuButton } from "../components/MenuButton.tsx";
import { pluralize } from "../components/pluralize.ts";

/** One media file of a project, as the project screen lists it. */
export type MediaItem = {
  id: string;
  name: string;
  kind: "video" | "audio" | "ebook";
  flashcardCount: number;
};

const kindIcons: Record<MediaItem["kind"], ReactNode> = {
  video: <Film className="size-5" aria-label="Video" />,
  audio: <Music className="size-5" aria-label="Audio" />,
  ebook: <BookText className="size-5" aria-label="Ebook" />,
};

/** Lists a project's media files with their kind and flashcards. Each row opens the file and has a menu for removing it. */
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
        <li
          key={item.id}
          className="flex items-center gap-1 rounded-md border border-line bg-surface pr-1 hover:border-line-strong"
        >
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-fg-muted">{kindIcons[item.kind]}</span>
            <span className="min-w-0 flex-1 truncate font-medium">
              {item.name}
            </span>
            {item.flashcardCount > 0 && (
              <span className="text-xs whitespace-nowrap text-fg-muted">
                {pluralize(item.flashcardCount, "card")}
              </span>
            )}
          </button>
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
      ))}
    </ul>
  );
}
