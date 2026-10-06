import { Link, Plus } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { type MediaItem, MediaList } from "./MediaList.tsx";

/**
 * The project's media files, with the ways to add one: from a file, and from a URL when a
 * media-source plugin is installed.
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
  const addFromUrl = onAddMediaFromUrl && (
    <Button onClick={onAddMediaFromUrl}>
      <Link className="size-4" aria-hidden />
      Add from URL
    </Button>
  );
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Media</h2>
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
      ) : (
        <MediaList
          media={media}
          onOpen={onOpenMedia}
          onDelete={onDeleteMedia}
        />
      )}
    </section>
  );
}
