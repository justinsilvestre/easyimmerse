import type { Rational } from "@easyimmerse/types";
import type { RefObject, SyntheticEvent } from "react";
import type { PlayerSource } from "./PlayerSource.ts";
import { describeMediaElementError } from "./playbackFailure.ts";
import { usePlayerSource } from "./usePlayerSource.ts";
import { useRegisteredPlayer } from "./useRegisteredPlayer.ts";

/**
 * The media element itself, registered as the app's player and attached to its source.
 * The controls drawn over the stage drive it, so it shows none of its own, and its context menu is suppressed,
 * since WebKit's offers the native controls, which would be drawn behind the app's. A video fills the space it is given,
 * keeping its proportions; an audio file's element stays hidden.
 * `crossOrigin="anonymous"` lets a canvas capture frames from a stream on another origin.
 */
export function MediaElement({
  source,
  frameRate,
  hasVideo,
  elementRef,
  onFailure,
}: {
  source: PlayerSource;
  frameRate: Rational | null;
  hasVideo: boolean;
  elementRef: RefObject<HTMLVideoElement | null>;
  onFailure: (cause: string) => void;
}) {
  const handlers = useRegisteredPlayer(elementRef, frameRate);
  usePlayerSource(elementRef, source, onFailure);
  // hls.js reports and recovers the element's own errors, so only a direct source reads them here.
  const onError = (event: SyntheticEvent<HTMLMediaElement>) => {
    if (source.kind === "direct")
      onFailure(describeMediaElementError(event.currentTarget.error));
  };
  return (
    <video
      ref={elementRef}
      playsInline
      crossOrigin="anonymous"
      preload="metadata"
      aria-label={hasVideo ? "Video" : "Audio"}
      className={hasVideo ? "h-full w-full object-contain" : "hidden"}
      onError={onError}
      onContextMenu={(event) => event.preventDefault()}
      {...handlers}
    />
  );
}
