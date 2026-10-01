import type { MediaFile, MediaKind } from "@easyimmerse/types";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../formatDuration.ts";
import { Card } from "./Card.tsx";
import { CardTitleButton } from "./CardTitleButton.tsx";
import { EmptyState } from "./EmptyState.tsx";
import { MediaKindIcon } from "./MediaKindIcon.tsx";
import { MediaListRemovalConfirmation } from "./MediaListRemovalConfirmation.tsx";
import { MediaListRemoveButton } from "./MediaListRemoveButton.tsx";

const mediaKindLabels: Record<MediaKind, string> = {
  video: "Video",
  audio: "Audio",
  document: "Document",
};

/** Lists a project's media files. Each opens when clicked and is removed only after the user confirms. */
export function MediaList({
  media,
  onOpenMedia,
  onRemoveMedia,
}: {
  media: readonly MediaFile[];
  onOpenMedia: (mediaId: string) => void;
  onRemoveMedia: (mediaId: string) => void;
}) {
  if (media.length === 0)
    return (
      <EmptyState title="No media yet">
        Add a video, audio file, or ebook to start reading and listening.
      </EmptyState>
    );
  return (
    <ul aria-label="Media" className="flex flex-col gap-3">
      {media.map((file) => (
        <MediaListItem
          key={file.id}
          file={file}
          onOpen={onOpenMedia}
          onRemove={onRemoveMedia}
        />
      ))}
    </ul>
  );
}

function MediaListItem({
  file,
  onOpen,
  onRemove,
}: {
  file: MediaFile;
  onOpen: (mediaId: string) => void;
  onRemove: (mediaId: string) => void;
}) {
  const [removal, setRemoval] = useState<"idle" | "confirming" | "cancelled">(
    "idle",
  );
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (removal === "cancelled") removeButtonRef.current?.focus();
  }, [removal]);
  return (
    <Card as="li" interactive className="px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <MediaKindIcon kind={file.kind} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <CardTitleButton
            className="break-words"
            onClick={() => onOpen(file.id)}
          >
            {file.name}
          </CardTitleButton>
          <p className="text-sm text-gray-500">
            {describeMediaFile(file).join(" · ")}
          </p>
        </div>
        {removal !== "confirming" && (
          <MediaListRemoveButton
            ref={removeButtonRef}
            mediaName={file.name}
            onClick={() => setRemoval("confirming")}
          />
        )}
      </div>
      {removal === "confirming" && (
        <MediaListRemovalConfirmation
          onConfirm={() => onRemove(file.id)}
          onCancel={() => setRemoval("cancelled")}
        />
      )}
    </Card>
  );
}

function describeMediaFile(file: MediaFile): string[] {
  const details = [mediaKindLabels[file.kind]];
  if (file.duration_ms !== null) details.push(formatDuration(file.duration_ms));
  if (file.kind !== "document")
    details.push(describeSubtitleTrackCount(file.subtitle_tracks.length));
  return details;
}

function describeSubtitleTrackCount(count: number): string {
  if (count === 0) return "No subtitles";
  return count === 1 ? "1 subtitle track" : `${count} subtitle tracks`;
}
