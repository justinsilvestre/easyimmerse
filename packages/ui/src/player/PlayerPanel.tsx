import { actions } from "@easyimmerse/state";
import type { Rational } from "@easyimmerse/types";
import { AudioLines, Music } from "lucide-react";
import { useRef, useState } from "react";
import { IconButton } from "../components/IconButton.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { MediaElement } from "./MediaElement.tsx";
import { PlayerFailure } from "./PlayerFailure.tsx";
import type { PlayerSource } from "./PlayerSource.ts";
import type { PlayerStatus } from "./PlayerStatus.ts";

/**
 * The player as it fills the media screen's black stage: the video, or artwork standing in for an audio file,
 * else a loading line or the failure. The stage is dark in both themes, so it uses palette colors.
 */
export function PlayerPanel({
  name,
  playback,
  onOpenTracks,
}: {
  name: string;
  playback: PlayerStatus;
  /** Opens the track choice dialog. Absent when the file offers nothing to choose. */
  onOpenTracks?: () => void;
}) {
  return (
    <section
      aria-label="Player"
      className="flex h-full w-full items-center justify-center text-white"
    >
      <PlayerBody name={name} playback={playback} onOpenTracks={onOpenTracks} />
    </section>
  );
}

function PlayerBody({
  name,
  playback,
  onOpenTracks,
}: {
  name: string;
  playback: PlayerStatus;
  onOpenTracks?: () => void;
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
      return (
        <div className="p-6">
          <PlayerFailure cause={playback.cause} />
        </div>
      );
    case "ready":
      return (
        <PlayerMedia
          name={name}
          source={playback.source}
          frameRate={playback.frameRate}
          hasVideo={playback.hasVideo}
          onOpenTracks={onOpenTracks}
        />
      );
  }
}

/** A failure belongs to the source it happened on; a new source starts clean. */
type SourceFailure = { url: string; cause: string };

/**
 * The video, or the artwork of an audio file, filling the stage. A click on the picture plays or pauses, as in other players;
 * the buttons, subtitles and pop-ups drawn over the stage are its siblings, so a click on them does not reach it.
 */
function PlayerMedia({
  name,
  source,
  frameRate,
  hasVideo,
  onOpenTracks,
}: {
  name: string;
  source: PlayerSource;
  frameRate: Rational | null;
  hasVideo: boolean;
  onOpenTracks?: () => void;
}) {
  const elementRef = useRef<HTMLVideoElement>(null);
  const [failure, setFailure] = useState<SourceFailure | null>(null);
  const dispatch = useAppDispatch();
  return (
    <>
      {/* Space and K play and pause from the keyboard; the click is the pointer's way to do the same. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: see above */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: see above */}
      <div
        className="flex h-full w-full items-center justify-center"
        onClick={() => dispatch(actions.playToggleRequested())}
      >
        <MediaElement
          source={source}
          frameRate={frameRate}
          hasVideo={hasVideo}
          elementRef={elementRef}
          onFailure={(cause) => setFailure({ url: source.url, cause })}
        />
        {!hasVideo && <AudioArtwork name={name} />}
      </div>
      {failure !== null && failure.url === source.url && (
        <div className="absolute inset-x-0 top-12 flex justify-center px-4">
          <PlayerFailure cause={failure.cause} />
        </div>
      )}
      {onOpenTracks && (
        <span className="absolute top-2 left-2 z-10 rounded-md bg-black/50">
          <IconButton label="Tracks" onClick={onOpenTracks}>
            <AudioLines className="size-4" />
          </IconButton>
        </span>
      )}
    </>
  );
}

function AudioArtwork({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="flex size-56 items-center justify-center rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-xl">
        <Music className="size-20 text-gray-400" aria-hidden />
      </div>
      <p className="text-lg text-gray-300">{name}</p>
    </div>
  );
}
