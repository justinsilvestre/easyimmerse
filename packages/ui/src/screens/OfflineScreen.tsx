import {
  actions,
  selectOfflineCues,
  selectOfflineParseFailed,
  selectPendingFilePick,
} from "@easyimmerse/state";
import { FilePlus } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { CuePanel } from "../media/CuePanel.tsx";

/**
 * What works without a server: reading a subtitles file from this device, parsed in the browser.
 * Projects, media, and flashcards are kept by a server, so they wait until one is connected.
 */
export function OfflineScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  const isPicking = useAppSelector(selectPendingFilePick);
  const cues = useAppSelector(selectOfflineCues);
  const hasFailed = useAppSelector(selectOfflineParseFailed);
  const openFile = () => dispatch(actions.subtitleFilePickRequested());
  return (
    <ScreenLayout onBack={onBack} backLabel="Projects">
      <h1 className="text-xl font-semibold">Working offline</h1>
      <p className="text-sm text-fg-muted">
        Projects, media, and flashcards are kept by a server. Until one is
        connected, you can read a subtitles file from this device.
      </p>
      {hasFailed && <p role="alert">The subtitles file could not be read.</p>}
      {cues.length === 0 ? (
        <EmptyState
          title="No subtitles open"
          description="Open an SRT or WebVTT file to read its lines."
          actions={
            <Button variant="primary" disabled={isPicking} onClick={openFile}>
              <FilePlus className="size-4" aria-hidden />
              Open a subtitles file
            </Button>
          }
        />
      ) : (
        <CuePanel
          cues={cues}
          translationCues={[]}
          activeCueIndex={null}
          flashcardCueIndexes={[]}
          onSeek={() => undefined}
          wordGestures={{}}
          onAddSubtitlesFile={openFile}
          onGenerateSubtitles={() => undefined}
        />
      )}
    </ScreenLayout>
  );
}
