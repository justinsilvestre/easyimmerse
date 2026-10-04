import { actions } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { ConversionNoticeDialog } from "../components/ConversionNoticeDialog.tsx";
import { TrackChoiceDialog } from "../components/TrackChoiceDialog.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { PlayerPanel } from "./PlayerPanel.tsx";
import { usePathPlayback } from "./usePathPlayback.ts";

/** Plays a media file that lives on the server's disk, directly or converted, with the dialogs that may precede it. */
export function PathMediaPlayer({
  projectId,
  mediaFile,
}: {
  projectId: string;
  mediaFile: MediaFile;
}) {
  const dispatch = useAppDispatch();
  const player = usePathPlayback(projectId, mediaFile);
  return (
    <>
      <PlayerPanel
        name={mediaFile.name}
        playback={player.playback}
        onOpenTracks={
          player.canChooseTracks ? player.openTrackChoice : undefined
        }
      />
      {player.trackChoice !== null && (
        <TrackChoiceDialog
          {...player.trackChoice}
          onChoose={player.chooseTracks}
          onCancel={player.cancelTrackChoice}
        />
      )}
      {player.playback.status === "notice" && (
        <ConversionNoticeDialog
          onPlay={player.acceptNotice}
          onCancel={() => dispatch(actions.closeMedia())}
        />
      )}
    </>
  );
}
