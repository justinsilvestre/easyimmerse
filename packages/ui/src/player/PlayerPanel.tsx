import { actions, selectPlayerFailure } from "@easyimmerse/state";
import type { Rational } from "@easyimmerse/types";
import { Music } from "lucide-react";
import { useRef } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { MediaElement } from "./MediaElement.tsx";
import { PlayerFailure } from "./PlayerFailure.tsx";
import type { PlayerSource } from "./PlayerSource.ts";
import type { PlayerStatus } from "./PlayerStatus.ts";
import { stagePictureAttribute } from "./stagePicture.ts";

/**
 * The player as it fills the media screen's black stage: the video, or artwork standing in for an audio file,
 * else a loading line or the failure. The stage is dark in both themes, so it uses palette colors.
 */
export function PlayerPanel({
  name,
  playback,
}: {
  name: string;
  playback: PlayerStatus;
}) {
  return (
    <section
      aria-label="Player"
      className="flex h-full w-full items-center justify-center text-white"
    >
      <PlayerBody name={name} playback={playback} />
    </section>
  );
}

function PlayerBody({
  name,
  playback,
}: {
  name: string;
  playback: PlayerStatus;
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
        />
      );
  }
}

/** The video, or the artwork of an audio file, filling the stage and marked as its picture, which the media screen makes clickable. */
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
  const dispatch = useAppDispatch();
  const failure = useAppSelector((state) =>
    selectPlayerFailure(state, source.url),
  );
  return (
    <>
      <div
        className="flex h-full w-full items-center justify-center"
        {...{ [stagePictureAttribute]: "" }}
      >
        <MediaElement
          source={source}
          frameRate={frameRate}
          hasVideo={hasVideo}
          elementRef={elementRef}
          onFailure={(cause) =>
            dispatch(actions.playerFailed(source.url, cause))
          }
        />
        {!hasVideo && <AudioArtwork name={name} />}
      </div>
      {failure !== null && (
        <div className="absolute inset-x-0 top-12 flex justify-center px-4">
          <PlayerFailure cause={failure} />
        </div>
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
