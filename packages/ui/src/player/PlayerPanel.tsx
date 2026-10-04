import { actions, selectCurrentTime } from "@easyimmerse/state";
import type { Rational } from "@easyimmerse/types";
import { useRef, useState } from "react";
import { Button } from "../components/Button.tsx";
import { formatPlayerTime } from "../components/formatPlayerTime.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { captureVideoFrame } from "./captureVideoFrame.ts";
import { MediaElement } from "./MediaElement.tsx";
import type { PlaybackState } from "./PlaybackState.ts";
import { PlayerFailure } from "./PlayerFailure.tsx";
import type { PlayerSource } from "./PlayerSource.ts";

/**
 * The dark panel the player lives in: the file's name and position, then the media element,
 * a loading line, or the failure. It is dark in both themes, so it uses palette colors.
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
  const currentTime = useAppSelector(selectCurrentTime);
  return (
    <section
      aria-label="Player"
      className="flex flex-col gap-3 rounded bg-gray-900 p-4 text-white"
    >
      <div className="flex items-center justify-between gap-4 text-sm text-gray-300">
        <span className="truncate">{name}</span>
        <span className="font-mono">{formatPlayerTime(currentTime)}</span>
      </div>
      <PlayerBody playback={playback} onOpenTracks={onOpenTracks} />
    </section>
  );
}

function PlayerBody({
  playback,
  onOpenTracks,
}: {
  playback: PlaybackState;
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
      return <PlayerFailure cause={playback.cause} />;
    case "ready":
      return (
        <PlayerMedia
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
  source,
  frameRate,
  hasVideo,
  onOpenTracks,
}: {
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
      {failure !== null && failure.url === source.url && (
        <PlayerFailure cause={failure.cause} />
      )}
      <PlayerControls
        onOpenTracks={onOpenTracks}
        onScreenshot={hasVideo ? takeScreenshot : undefined}
      />
      {screenshot !== null && (
        <img
          src={screenshot}
          alt="Screenshot of the current frame"
          className="max-h-24 self-start rounded"
        />
      )}
    </>
  );
}

function PlayerControls({
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
          className="border-gray-600 hover:bg-gray-800"
          onClick={onOpenTracks}
        >
          Tracks
        </Button>
      )}
      {onScreenshot && (
        <Button
          className="border-gray-600 hover:bg-gray-800"
          onClick={onScreenshot}
        >
          Screenshot
        </Button>
      )}
    </div>
  );
}
