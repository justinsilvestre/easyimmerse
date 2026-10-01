import type { WordHover } from "@easyimmerse/state";
import { actions, selectPlayer } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { ConversionNotice } from "../components/ConversionNotice.tsx";
import { MediaView } from "../components/MediaView.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/**
 * Plays the open video or audio with its subtitles, and reports when the media cannot be played.
 * Before media that converts as it plays starts, it asks the user to confirm the conversion notice.
 */
export function MediaScreenPlayer({
  kind,
  targetCues,
  translationCues,
  onWordActivated,
}: {
  kind: "video" | "audio";
  targetCues: readonly Cue[] | null;
  translationCues: readonly Cue[] | null;
  onWordActivated: (hover: WordHover) => void;
}) {
  const dispatch = useAppDispatch();
  const { playback, heldPlayback, playbackError } =
    useAppSelector(selectPlayer);
  return (
    <>
      {playbackError && (
        <p role="alert" className="bg-red-50 px-4 py-2 text-sm text-red-800">
          <span className="font-medium">The media could not be played.</span>{" "}
          {playbackError}
        </p>
      )}
      {heldPlayback && (
        <ConversionNotice
          onPlay={(dontShowAgain) =>
            dispatch(actions.conversionNoticeConfirmed(dontShowAgain))
          }
          onCancel={() => dispatch(actions.mediaClosed())}
        />
      )}
      <MediaView
        kind={kind}
        playback={playback}
        targetCues={targetCues}
        translationCues={translationCues}
        onWordActivated={onWordActivated}
        onAddSubtitles={(role) =>
          dispatch(actions.filePickRequested({ kind: "subtitles", role }))
        }
        onGenerateSubtitles={() =>
          dispatch(
            actions.notificationRequested(
              "Generating subtitles needs a plugin or subscription.",
            ),
          )
        }
      />
    </>
  );
}
