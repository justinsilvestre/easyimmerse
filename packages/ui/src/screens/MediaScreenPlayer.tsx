import type { WordHover } from "@easyimmerse/state";
import { actions, selectPlayer } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { MediaView } from "../components/MediaView.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** Plays the open video or audio with its subtitles, and reports when the media cannot be loaded. */
export function MediaScreenPlayer({
  kind,
  name,
  targetCues,
  translationCues,
  onWordActivated,
}: {
  kind: "video" | "audio";
  name: string;
  targetCues: readonly Cue[] | null;
  translationCues: readonly Cue[] | null;
  onWordActivated: (hover: WordHover) => void;
}) {
  const dispatch = useAppDispatch();
  const { mediaUrl, mediaUrlError } = useAppSelector(selectPlayer);
  return (
    <>
      {mediaUrlError && (
        <p role="alert" className="bg-red-50 px-4 py-2 text-sm text-red-800">
          Could not load the media: {mediaUrlError}
        </p>
      )}
      <MediaView
        kind={kind}
        name={name}
        src={mediaUrl ?? ""}
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
