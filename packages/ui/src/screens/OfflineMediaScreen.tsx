import { useParseTimedTextMutation } from "@easyimmerse/backend";
import type { PickedMediaFile } from "@easyimmerse/state";
import {
  actions,
  selectChosenMediaFile,
  selectChosenSubtitleFile,
  selectPlayer,
} from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { CuePanel } from "../media/CuePanel.tsx";
import { findCueAt } from "../media/findCue.ts";
import { MediaView } from "../media/MediaView.tsx";
import { BrowserFilePlayer } from "../player/BrowserFilePlayer.tsx";
import { usePlayerCallbacks } from "./media/usePlayerCallbacks.ts";

const noCues: readonly Cue[] = [];

/**
 * Plays a media file from this device with subtitles from this device, for when no server answers.
 * Nothing is saved, and looking up words and making flashcards need a server.
 */
export function OfflineMediaScreen({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  const player = useAppSelector(selectPlayer);
  const currentMs = player.currentTimeSeconds * 1000;
  const mediaFile = useChosenMediaFile();
  const cues = useChosenSubtitles();
  const [panels, setPanels] = useState({
    cues: true,
    waveform: false,
    distractionFree: false,
  });
  const notifyNeedsServer = () =>
    dispatch(
      actions.notificationRequested(
        "Looking up words and making flashcards need a server.",
      ),
    );
  const playerCallbacks = usePlayerCallbacks({
    cues,
    currentMs,
    durationMs: player.durationSeconds * 1000,
    onToggleSubtitleDisplay: () => undefined,
    onTogglePanel: (panel) =>
      setPanels((current) => ({ ...current, [panel]: !current[panel] })),
  });
  return (
    <MediaView
      title={mediaFile?.name ?? "Offline"}
      language={null}
      stage={
        mediaFile ? (
          <BrowserFilePlayer key={mediaFile.name} mediaFile={mediaFile} />
        ) : (
          <Button onClick={() => dispatch(actions.mediaFilePickRequested())}>
            <FolderOpen className="size-4" aria-hidden />
            Open a media file
          </Button>
        )
      }
      playback={{
        isPlaying: player.isPlaying,
        currentMs,
        durationMs: player.durationSeconds * 1000,
        volume: player.volume,
        speed: player.rate,
      }}
      tracks={{
        audio: [],
        subtitles: [],
        audioId: null,
        targetSubtitlesId: null,
        translationSubtitlesId: null,
      }}
      cues={cues}
      translationCues={noCues}
      waveform={null}
      panels={panels}
      subtitleDisplay="target"
      playerCallbacks={playerCallbacks}
      onBack={() => {
        dispatch(actions.closeMedia());
        onBack();
      }}
      onWordHover={() => undefined}
      onWordClick={notifyNeedsServer}
      onLookup={notifyNeedsServer}
      onAddFlashcard={notifyNeedsServer}
      sidePanel={
        panels.cues && (
          <CuePanel
            cues={cues}
            translationCues={noCues}
            activeCueIndex={findCueAt(cues, currentMs)?.index ?? null}
            flashcardCueIndexes={[]}
            onSeek={(ms) => dispatch(actions.seekRequested(ms / 1000))}
            onWordHover={() => undefined}
            onWordClick={notifyNeedsServer}
            onAddSubtitlesFile={() =>
              dispatch(actions.subtitleFilePickRequested("target"))
            }
            onGenerateSubtitles={notifyNeedsServer}
          />
        )
      }
    />
  );
}

/** Takes the media file the user picks out of the store, so that nothing tries to add it to a project. */
function useChosenMediaFile(): PickedMediaFile | null {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectChosenMediaFile);
  const [mediaFile, setMediaFile] = useState<PickedMediaFile | null>(null);
  useEffect(() => {
    if (chosen === null) return;
    setMediaFile(chosen);
    dispatch(actions.chosenMediaFileTaken());
  }, [chosen, dispatch]);
  return mediaFile;
}

/** Parses the subtitles file the user picks on this device, through WebAssembly when there is no server. */
function useChosenSubtitles(): readonly Cue[] {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectChosenSubtitleFile);
  const [parseTimedText, { data }] = useParseTimedTextMutation();
  useEffect(() => {
    if (chosen === null) return;
    dispatch(actions.subtitleFileAdded());
    parseTimedText({ source: chosen.file.source, format: null })
      .unwrap()
      .catch(() => dispatch(actions.subtitleFileAddFailed()));
  }, [chosen, parseTimedText, dispatch]);
  return data?.cues ?? noCues;
}
