import {
  skipToken,
  useGetSubtitleCuesQuery,
  useParseTimedTextMutation,
} from "@easyimmerse/backend";
import { selectSubtitles } from "@easyimmerse/state";
import type { Cue, SubtitleTrack } from "@easyimmerse/types";
import { useEffect } from "react";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Returns the cues of a subtitle track, or null while they load and when there is no track.
 * The server reads files on disk and embedded tracks. A file stored in the browser is parsed from the text the store holds.
 */
export function useSubtitleCues(
  projectId: string,
  mediaId: string,
  track: SubtitleTrack | undefined,
): readonly Cue[] | null {
  const isInBrowser = track !== undefined && isStoredInBrowser(track);
  const fromServer = useGetSubtitleCuesQuery(
    track === undefined || isInBrowser
      ? skipToken
      : { projectId, mediaId, trackId: track.id },
  );
  const fromBrowser = useBrowserFileCues(isInBrowser ? track : undefined);
  if (track === undefined) return null;
  return isInBrowser ? fromBrowser : (fromServer.data?.cues ?? null);
}

function useBrowserFileCues(
  track: SubtitleTrack | undefined,
): readonly Cue[] | null {
  const text = useAppSelector((state) =>
    track === undefined
      ? undefined
      : selectSubtitles(state).browserFileTexts[track.id],
  );
  const [parseTimedText, { data }] = useParseTimedTextMutation();
  useEffect(() => {
    if (text !== undefined)
      parseTimedText({ source: { kind: "inline", text }, format: null });
  }, [text, parseTimedText]);
  return text === undefined ? null : (data?.cues ?? null);
}

function isStoredInBrowser({ source }: SubtitleTrack): boolean {
  return source.kind === "file" && source.source.kind === "browser_file";
}
