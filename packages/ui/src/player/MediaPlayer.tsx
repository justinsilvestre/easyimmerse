import { useListMediaFilesQuery } from "@easyimmerse/backend";
import { selectCurrentMediaFileId } from "@easyimmerse/state";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { BrowserFilePlayer } from "./BrowserFilePlayer.tsx";
import { PathMediaPlayer } from "./PathMediaPlayer.tsx";
import { failedPlayback, loadingPlayback } from "./PlaybackState.ts";
import { PlayerPanel } from "./PlayerPanel.tsx";

/** The player for the project's open media file, which fills the media screen's stage, or an invitation to open one. */
export function MediaPlayer({ projectId }: { projectId: string }) {
  const mediaFileId = useAppSelector(selectCurrentMediaFileId);
  const { data } = useListMediaFilesQuery(projectId);
  if (mediaFileId === null) return <EmptyPlayer />;
  const mediaFile = data?.media_files.find((file) => file.id === mediaFileId);
  if (mediaFile === undefined)
    return (
      <PlayerPanel
        name=""
        playback={
          data === undefined
            ? loadingPlayback
            : failedPlayback("This media file is no longer in the project.")
        }
      />
    );
  return mediaFile.source.kind === "path" ? (
    <PathMediaPlayer
      key={mediaFile.id}
      projectId={projectId}
      mediaFile={mediaFile}
    />
  ) : (
    <BrowserFilePlayer key={mediaFile.id} mediaFile={mediaFile} />
  );
}

function EmptyPlayer() {
  return (
    <section aria-label="Player" className="p-6 text-sm text-gray-400">
      Open a media file to play it.
    </section>
  );
}
