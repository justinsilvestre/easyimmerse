import {
  skipToken,
  useChoosePlaybackMethodQuery,
  useGetMediaTracksQuery,
} from "@easyimmerse/backend";
import { selectPathPlayback } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import type { PlayerStatus } from "./PlayerStatus.ts";
import { selectPathPlayerStatus } from "./selectPathPlayerStatus.ts";

/** What the player shows for a file on the server's disk, from the tracks and the playback method the media screen's update asked for. */
export function usePathPlayback(
  projectId: string,
  mediaFile: MediaFile,
): PlayerStatus {
  const playback = useAppSelector(selectPathPlayback);
  const file = { projectId, mediaFileId: mediaFile.id };
  // Subscribed to so that the entries stay in the cache while the player shows them.
  // The update sends both requests; the arguments come from its state, so the hooks never send one of their own.
  useGetMediaTracksQuery(playback === null ? skipToken : file);
  useChoosePlaybackMethodQuery(
    playback?.methodRequest
      ? { ...file, request: playback.methodRequest }
      : skipToken,
  );
  return useAppSelector(selectPathPlayerStatus);
}
