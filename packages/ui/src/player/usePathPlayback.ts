import {
  skipToken,
  useGetMediaTracksQuery,
  usePlanPlaybackQuery,
} from "@easyimmerse/backend";
import {
  selectPathPlayback,
  selectPreference,
  selectServerConfig,
} from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { derivePlayerStatus } from "./derivePlayerStatus.ts";
import type { PlayerStatus } from "./PlayerStatus.ts";

/** What the player shows for a file on the server's disk, from the tracks and the plan the media screen's update asked for. */
export function usePathPlayback(
  projectId: string,
  mediaFile: MediaFile,
): PlayerStatus {
  const playback = useAppSelector(selectPathPlayback);
  const server = useAppSelector(selectServerConfig);
  const noticeDismissed =
    useAppSelector(selectPreference("conversionNoticeDismissed")) === "true";
  const file = { projectId, mediaFileId: mediaFile.id };
  // Read through the query hooks so that the entries stay in the cache while the player shows them.
  // The update sends both requests; the arguments come from its state, so the hooks never send one of their own.
  const tracks = useGetMediaTracksQuery(playback === null ? skipToken : file);
  const plan = usePlanPlaybackQuery(
    playback?.planRequest
      ? { ...file, request: playback.planRequest }
      : skipToken,
  );
  return derivePlayerStatus({
    server,
    ...file,
    tracks: tracks.data,
    tracksError: tracks.error,
    playback: plan.data,
    playbackError: plan.error,
    selection: playback?.selection ?? null,
    noticeSettled: noticeDismissed || playback?.isConversionAccepted === true,
  });
}
