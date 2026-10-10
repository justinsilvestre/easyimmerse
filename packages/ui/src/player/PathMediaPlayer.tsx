import type { MediaFile } from "@easyimmerse/types";
import { PlaybackDialogs } from "./PlaybackDialogs.tsx";
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
  return (
    <>
      <PlayerPanel
        name={mediaFile.name}
        playback={usePathPlayback(projectId, mediaFile)}
      />
      <PlaybackDialogs projectId={projectId} mediaFileId={mediaFile.id} />
    </>
  );
}
