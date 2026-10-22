import { isAudioFileName } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import { browserFileNotices } from "../media/browserFileNotices.ts";
import { PlayerPanel } from "./PlayerPanel.tsx";
import type { PlayerStatus } from "./PlayerStatus.ts";
import { failedPlayback, loadingPlayback } from "./PlayerStatus.ts";
import { useObjectUrl } from "./useObjectUrl.ts";

/** Plays a file the browser holds from a blob URL. Such a file is never converted and has no waveform. */
export function BrowserFilePlayer({ mediaFile }: { mediaFile: MediaFile }) {
  return (
    <PlayerPanel
      name={mediaFile.name}
      playback={useBrowserFilePlayback(mediaFile)}
    />
  );
}

/** What the player shows for a file the browser holds: its blob URL once the file is found in the browser's registry. */
export function useBrowserFilePlayback(mediaFile: MediaFile): PlayerStatus {
  const registry = useBrowserFileRegistry();
  const file = registry?.find(mediaFile.name, mediaFile.source) ?? null;
  const url = useObjectUrl(file);
  return browserPlayback(registry !== null, file, url, mediaFile.name);
}

function browserPlayback(
  hasRegistry: boolean,
  file: File | null,
  url: string | null,
  name: string,
): PlayerStatus {
  if (!hasRegistry) return failedPlayback(browserFileNotices.unreachable);
  if (file === null) return failedPlayback(browserFileNotices.notOpen("play"));
  if (url === null) return loadingPlayback;
  return {
    status: "ready",
    source: { kind: "direct", url },
    frameRate: null,
    hasVideo: !isAudioFileName(name),
  };
}
