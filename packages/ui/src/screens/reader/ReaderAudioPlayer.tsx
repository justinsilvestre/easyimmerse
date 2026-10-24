import {
  actions,
  isPlayedByServer,
  selectPlayer,
  selectPlayerFailure,
} from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useRef } from "react";
import { useBrowserFilePlayback } from "../../components/player/BrowserFilePlayer.tsx";
import { MediaElement } from "../../components/player/MediaElement.tsx";
import type { PlayerStatus } from "../../components/player/PlayerStatus.ts";
import { usePathPlayback } from "../../components/player/usePathPlayback.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { ReaderAudioBar } from "./ReaderAudioBar.tsx";

/**
 * The player of the audio file a book is aligned with: the hidden media element the media screen plays an audio file with,
 * and the compact bar that drives it.
 *
 * The reader hosts a player for another file than its own because the book itself has nothing to play: its sentences are
 * heard in the audio file. Once the server cache names that file, the store's player
 * plays it in place of the route's file, as `playedMediaFileOf` in the state package describes, so the media screen's
 * playback works unchanged: the playback method is worked out for the audio file, its stored position is resumed and saved,
 * and seeks and plays reach this element through the player registry as they reach the media screen's.
 */
export function ReaderAudioPlayer({
  projectId,
  audioFile,
}: {
  projectId: string;
  audioFile: MediaFile;
}) {
  return isPlayedByServer(audioFile) ? (
    <PathAudio key={audioFile.id} projectId={projectId} audioFile={audioFile} />
  ) : (
    <BrowserAudio key={audioFile.id} audioFile={audioFile} />
  );
}

function PathAudio({
  projectId,
  audioFile,
}: {
  projectId: string;
  audioFile: MediaFile;
}) {
  return <AudioPlayback playback={usePathPlayback(projectId, audioFile)} />;
}

function BrowserAudio({ audioFile }: { audioFile: MediaFile }) {
  return <AudioPlayback playback={useBrowserFilePlayback(audioFile)} />;
}

/** The hidden element, once the audio's source is known, and the bar, which shows why the audio cannot play when it cannot. */
function AudioPlayback({ playback }: { playback: PlayerStatus }) {
  const dispatch = useAppDispatch();
  const elementRef = useRef<HTMLVideoElement>(null);
  const sourceUrl = playback.status === "ready" ? playback.source.url : null;
  return (
    <>
      {playback.status === "ready" && (
        <MediaElement
          source={playback.source}
          frameRate={null}
          hasVideo={false}
          elementRef={elementRef}
          onFailure={(cause) =>
            dispatch(actions.playerFailed(playback.source.url, cause))
          }
        />
      )}
      <ConnectedReaderAudioBar
        statusFailure={playback.status === "error" ? playback.cause : null}
        sourceUrl={sourceUrl}
      />
    </>
  );
}

/** The bar, showing the store's player. It reads the player itself, so that the time moving renders only the bar. */
function ConnectedReaderAudioBar({
  statusFailure,
  sourceUrl,
}: {
  statusFailure: string | null;
  sourceUrl: string | null;
}) {
  const dispatch = useAppDispatch();
  const player = useAppSelector(selectPlayer);
  const elementFailure = useAppSelector((state) =>
    sourceUrl === null ? null : selectPlayerFailure(state, sourceUrl),
  );
  return (
    <ReaderAudioBar
      isPlaying={player.isPlaying}
      currentMs={player.currentTimeSeconds * 1000}
      durationMs={player.durationSeconds * 1000}
      failure={statusFailure ?? elementFailure}
      onTogglePlay={() => dispatch(actions.playToggleRequested())}
      onSeek={(ms) => dispatch(actions.seekRequested(ms / 1000))}
    />
  );
}
