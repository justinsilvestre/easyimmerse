import { skipToken, useGetMediaTracksQuery } from "@easyimmerse/backend";
import { actions, selectDialog, tracksOfKind } from "@easyimmerse/state";
import { ConversionNoticeDialog } from "../components/ConversionNoticeDialog.tsx";
import { TrackChoiceDialog } from "../components/TrackChoiceDialog.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { trackChoiceOf } from "./trackChoiceOf.ts";

/** The track choice or the conversion notice of a file on the server's disk, whichever the media screen has open. */
export function PlaybackDialogs({
  projectId,
  mediaFileId,
}: {
  projectId: string;
  mediaFileId: string;
}) {
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectDialog);
  const container = useGetMediaTracksQuery(
    dialog?.kind === "trackChoice" ? { projectId, mediaFileId } : skipToken,
  ).data?.container;
  if (dialog?.kind === "trackChoice" && container !== undefined)
    return (
      <TrackChoiceDialog
        videoTracks={tracksOfKind(container, "video").map(trackChoiceOf)}
        audioTracks={tracksOfKind(container, "audio").map(trackChoiceOf)}
        selection={dialog.selection}
        onSelect={(selection) =>
          dispatch(actions.trackChoiceChanged(selection))
        }
        onChoose={(selection) => dispatch(actions.tracksChosen(selection))}
        onCancel={() => dispatch(actions.trackChoiceCancelled())}
      />
    );
  if (dialog?.kind === "conversionNotice")
    return (
      <ConversionNoticeDialog
        dismissForGood={dialog.dismissForGood}
        onDismissForGoodToggle={() =>
          dispatch(actions.conversionNoticeDismissalToggled())
        }
        onPlay={() => dispatch(actions.conversionNoticeAccepted())}
        onCancel={() => dispatch(actions.closeMedia())}
      />
    );
  return null;
}
