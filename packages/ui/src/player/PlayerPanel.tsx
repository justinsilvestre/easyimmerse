import type { Rational } from "@easyimmerse/types";
import { ListVideo, Music } from "lucide-react";
import { useRef, useState } from "react";
import { IconButton } from "../components/IconButton.tsx";
import { MediaElement } from "./MediaElement.tsx";
import type { PlaybackState } from "./PlaybackState.ts";
import { PlayerFailure } from "./PlayerFailure.tsx";
import type { PlayerSource } from "./PlayerSource.ts";

/**
 * Fills the media screen's black stage: the media element, a loading line, or the failure.
 * An audio file shows a placeholder for its artwork in place of a picture.
 */
export function PlayerPanel({
  name,
  playback,
  onOpenTracks,
}: {
  name: string;
  playback: PlaybackState;
  /** Opens the track choice dialog. Absent when the file offers nothing to choose. */
  onOpenTracks?: () => void;
}) {
  return (
    <section
      aria-label="Player"
      className="relative flex size-full items-center justify-center text-white"
    >
      <PlayerBody name={name} playback={playback} />
      {onOpenTracks && playback.status === "ready" && (
        <span className="absolute top-2 left-2 rounded-md bg-black/50">
          <IconButton label="Tracks" onClick={onOpenTracks}>
            <ListVideo className="size-4" />
          </IconButton>
        </span>
      )}
    </section>
  );
}

function PlayerBody({
  name,
  playback,
}: {
  name: string;
  playback: PlaybackState;
}) {
  switch (playback.status) {
    case "loading":
    case "notice":
      return (
        <p role="status" className="text-sm text-gray-400">
          Loading…
        </p>
      );
    case "error":
      return <PlayerFailure cause={playback.cause} />;
    case "ready":
      return (
        <PlayerMedia
          name={name}
          source={playback.source}
          frameRate={playback.frameRate}
          hasVideo={playback.hasVideo}
        />
      );
  }
}

/** A failure belongs to the source it happened on; a new source starts clean. */
type SourceFailure = { url: string; cause: string };

function PlayerMedia({
  name,
  source,
  frameRate,
  hasVideo,
}: {
  name: string;
  source: PlayerSource;
  frameRate: Rational | null;
  hasVideo: boolean;
}) {
  const elementRef = useRef<HTMLVideoElement>(null);
  const [failure, setFailure] = useState<SourceFailure | null>(null);
  return (
    <>
      {!hasVideo && <ArtworkPlaceholder name={name} />}
      <MediaElement
        source={source}
        frameRate={frameRate}
        hasVideo={hasVideo}
        elementRef={elementRef}
        onFailure={(cause) => setFailure({ url: source.url, cause })}
      />
      {failure !== null && failure.url === source.url && (
        <div className="absolute inset-x-4 top-4">
          <PlayerFailure cause={failure.cause} />
        </div>
      )}
    </>
  );
}

function ArtworkPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="flex size-56 max-h-[40dvh] max-w-[40dvh] items-center justify-center rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-xl">
        <Music className="size-20 text-gray-400" aria-hidden />
      </div>
      <p className="text-lg text-gray-300">{name}</p>
    </div>
  );
}
