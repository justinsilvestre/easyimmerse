import { useParseTimedTextMutation } from "@easyimmerse/backend";
import type { PickedFile } from "@easyimmerse/state";
import {
  actions,
  selectPendingFilePick,
  selectPendingSubtitleFile,
} from "@easyimmerse/state";
import { FilePlus } from "lucide-react";
import { useEffect, useRef } from "react";
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
  const { cues, hasFailed } = useParsedChosenFile();
  const openFile = () => dispatch(actions.filePickRequested());
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

/** Parses the subtitles file the user picked, in WebAssembly when no server is connected. */
function useParsedChosenFile() {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectPendingSubtitleFile);
  const [parseTimedText, { data, isError }] = useParseTimedTextMutation();
  const sent = useRef<PickedFile | null>(null);
  useEffect(() => {
    if (chosen === null || sent.current === chosen) return;
    sent.current = chosen;
    parseTimedText({ source: chosen.source, format: null }).finally(() =>
      dispatch(actions.subtitleFileAdded()),
    );
  }, [chosen, parseTimedText, dispatch]);
  return { cues: data?.cues ?? [], hasFailed: isError };
}
