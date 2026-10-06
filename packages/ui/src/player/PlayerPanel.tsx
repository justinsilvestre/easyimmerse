import { actions } from "@easyimmerse/state";
import type { Rational } from "@easyimmerse/types";
import { Music } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { captureVideoFrame } from "./captureVideoFrame.ts";
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
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const takeScreenshot = () => {
    const video = elementRef.current;
    if (video === null) return;
    captureVideoFrame(video).then(setScreenshot, () =>
      dispatch(
        actions.notificationRequested("The screenshot could not be taken"),
      ),
    );
  };
  return (
    <>
      <MediaElement
        source={source}
        frameRate={frameRate}
        hasVideo={hasVideo}
        elementRef={elementRef}
        onFailure={(cause) => setFailure({ url: source.url, cause })}
      />
      {!hasVideo && <AudioArtwork name={name} />}
      {failure !== null && failure.url === source.url && (
        <div className="absolute inset-x-0 top-12 flex justify-center px-4">
          <PlayerFailure cause={failure.cause} />
        </div>
      )}
      <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-2">
        <PlayerButtons
          onOpenTracks={onOpenTracks}
          onScreenshot={hasVideo ? takeScreenshot : undefined}
        />
        {screenshot !== null && (
          <button
            type="button"
            aria-label="Dismiss the screenshot"
            onClick={() => setScreenshot(null)}
          >
            <img
              src={screenshot}
              alt="Screenshot of the current frame"
              className="max-h-24 rounded shadow-lg"
            />
          </button>
        )}
      </div>
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

function PlayerButtons({
  onOpenTracks,
  onScreenshot,
}: {
  onOpenTracks?: () => void;
  onScreenshot?: () => void;
}) {
  if (onOpenTracks === undefined && onScreenshot === undefined) return null;
  return (
    <div className="flex gap-2">
      {onOpenTracks && (
        <Button
          size="sm"
          className="border-gray-600 bg-black/50 text-white hover:bg-gray-800"
          onClick={onOpenTracks}
        >
          Tracks
        </Button>
      )}
      {onScreenshot && (
        <Button
          size="sm"
          className="border-gray-600 bg-black/50 text-white hover:bg-gray-800"
          onClick={onScreenshot}
        >
          Screenshot
        </Button>
      )}
    </div>
  );
}
