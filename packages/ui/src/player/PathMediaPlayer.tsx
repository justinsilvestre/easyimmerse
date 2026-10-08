import { actions } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useEffect } from "react";
import { ConversionNoticeDialog } from "../components/ConversionNoticeDialog.tsx";
import { TrackChoiceDialog } from "../components/TrackChoiceDialog.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { PlayerPanel } from "./PlayerPanel.tsx";
import { useOfferTrackChoice } from "./trackChoiceContext.ts";
import { usePathPlayback } from "./usePathPlayback.ts";

/**
 * Plays a media file that lives on the server's disk, directly or converted, with the dialogs that may precede it.
 * While the file offers tracks to choose from, the screen is told how to open the choice, for its Tracks button.
 */
export function PathMediaPlayer({
  projectId,
  mediaFile,
}: {
  projectId: string;
  mediaFile: MediaFile;
}) {
  const dispatch = useAppDispatch();
  const player = usePathPlayback(projectId, mediaFile);
  const offerTrackChoice = useOfferTrackChoice();
  const { canChooseTracks, openTrackChoice } = player;
  useEffect(() => {
    offerTrackChoice(canChooseTracks ? openTrackChoice : null);
    return () => offerTrackChoice(null);
  }, [offerTrackChoice, canChooseTracks, openTrackChoice]);
  return (
    <>
      <PlayerPanel name={mediaFile.name} playback={player.playback} />
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
