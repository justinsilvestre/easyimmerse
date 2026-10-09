import type { MediaFile } from "@easyimmerse/types";
import { useEffect, useMemo } from "react";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import { browserFileNotices } from "../media/browserFileNotices.ts";
import { isAudioFileName } from "./isAudioFileName.ts";
import { PlayerPanel } from "./PlayerPanel.tsx";
import type { PlayerStatus } from "./PlayerStatus.ts";
import { failedPlayback, loadingPlayback } from "./PlayerStatus.ts";

/** Plays a file the browser holds from a blob URL. Such a file is never converted and has no waveform. */
export function BrowserFilePlayer({ mediaFile }: { mediaFile: MediaFile }) {
  const registry = useBrowserFileRegistry();
  const file = registry?.find(mediaFile.name, mediaFile.source) ?? null;
  const url = useObjectUrl(file);
  return (
    <PlayerPanel
      name={mediaFile.name}
      playback={browserPlayback(registry !== null, file, url, mediaFile.name)}
    />
  );
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

/** A blob URL for the file, revoked when the file changes or the player unmounts. */
function useObjectUrl(file: File | null): string | null {
  const url = useMemo(
    () => (file === null ? null : URL.createObjectURL(file)),
    [file],
  );
  useEffect(() => {
    if (url === null) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
