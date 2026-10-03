import { Plus } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { type MediaItem, MediaList } from "./MediaList.tsx";

/** The project's media files, with the way to add one. */
export function MediaSection({
  media,
  onAddMedia,
  onOpenMedia,
}: {
  media: readonly MediaItem[];
  onAddMedia: () => void;
  onOpenMedia: (mediaId: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Media</h2>
        {media.length > 0 && (
          <Button onClick={onAddMedia}>
            <Plus className="size-4" aria-hidden />
            Add media
          </Button>
        )}
      </div>
      {media.length === 0 ? (
        <EmptyState
          title="No media yet"
          description="Add a video, an audio file, or an ebook in the project's language."
          actions={
            <Button variant="primary" onClick={onAddMedia}>
              <Plus className="size-4" aria-hidden />
              Add media
            </Button>
          }
        />
      ) : (
        <MediaList media={media} onOpen={onOpenMedia} />
      )}
    </section>
  );
}
