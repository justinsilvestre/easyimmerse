import { Link, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { MenuButton } from "../components/MenuButton.tsx";
import { type MediaItem, MediaList } from "./MediaList.tsx";
import {
  type MediaCategory,
  mediaCategories,
  mediaCategoryLabel,
  mediaOfCategory,
} from "./mediaCategories.ts";

/**
 * The project's media files, with the ways to add one: from a file, and from a URL when a
 * media-source plugin is installed.
 * The heading is a menu that narrows the list to one kind of file, videos, audio or ebooks, each option counting its files.
 */
export function MediaSection({
  media,
  onAddMedia,
  onAddMediaFromUrl = null,
  onOpenMedia,
  onDeleteMedia,
}: {
  media: readonly MediaItem[];
  onAddMedia: () => void;
  /** Null when no installed plugin fetches media from a URL. */
  onAddMediaFromUrl?: (() => void) | null;
  onOpenMedia: (mediaId: string) => void;
  onDeleteMedia: (mediaId: string) => void;
}) {
  const [category, setCategory] = useState<MediaCategory>("all");
  const shown = mediaOfCategory(media, category);
  const addFromUrl = onAddMediaFromUrl && (
    <Button onClick={onAddMediaFromUrl}>
      <Link className="size-4" aria-hidden />
      Add from URL
    </Button>
  );
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          <MenuButton
            label="Media category"
            size="md"
            items={mediaCategories.map((option) => ({
              label: `${mediaCategoryLabel(option)} (${mediaOfCategory(media, option).length})`,
              isChecked: option === category,
              closesOnSelect: true,
              onSelect: () => setCategory(option),
            }))}
          >
            {mediaCategoryLabel(category)}
          </MenuButton>
        </h2>
        {media.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {addFromUrl}
            <Button onClick={onAddMedia}>
              <Plus className="size-4" aria-hidden />
              Add media
            </Button>
          </div>
        )}
      </div>
      {media.length === 0 ? (
        <EmptyState
          title="No media yet"
          description="Add a video, an audio file, or an ebook in the project's language."
          actions={
            <>
              <Button variant="primary" onClick={onAddMedia}>
                <Plus className="size-4" aria-hidden />
                Add media
              </Button>
              {addFromUrl}
            </>
          }
        />
      ) : shown.length === 0 ? (
        <p className="text-sm text-fg-muted">
          No {mediaCategoryLabel(category).toLowerCase()} in this project yet.
        </p>
      ) : (
        <MediaList
          media={shown}
          onOpen={onOpenMedia}
          onDelete={onDeleteMedia}
        />
      )}
    </section>
  );
}
