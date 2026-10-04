import { useListFlashcardsQuery } from "@easyimmerse/backend";
import { actions, selectPlayer } from "@easyimmerse/state";
import type { Flashcard, MediaFile, Project } from "@easyimmerse/types";
import { ArrowLeft } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "../components/Button.tsx";
import { PlayerWaveform, useMediaFile } from "../components/PlayerWaveform.tsx";
import { useAddChosenSubtitleFile } from "../hooks/useAddChosenSubtitleFile.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useDismissOnOutsidePointer } from "../hooks/useDismissOnOutsidePointer.ts";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import { findCueAt } from "../media/findCue.ts";
import { MediaView } from "../media/MediaView.tsx";
import type { SubtitleDisplay } from "../media/SubtitleOverlay.tsx";
import { TrackPickerDialog } from "../media/TrackPickerDialog.tsx";
import { useNavigationActions } from "../navigationContext.ts";
import { MediaPlayer } from "../player/MediaPlayer.tsx";
import {
  cueIndexesWithFlashcards,
  segmentsOfFlashcards,
} from "./media/flashcardRecords.ts";
import { MediaSidePanel } from "./media/MediaSidePanel.tsx";
import { fileTrackId } from "./media/subtitleTrackOptions.ts";
import { useClipLoop } from "./media/useClipLoop.ts";
import { useFlashcardCreation } from "./media/useFlashcardCreation.ts";
import { useFlashcardEditing } from "./media/useFlashcardEditing.ts";
import { useLookupPopup } from "./media/useLookupPopup.ts";
import { useMediaShortcuts } from "./media/useMediaShortcuts.ts";
import { usePlayerCallbacks } from "./media/usePlayerCallbacks.ts";
import { useSavedFlashcardGestures } from "./media/useSavedFlashcardGestures.ts";
import { useSubtitles } from "./media/useSubtitles.ts";

/** The screen for watching or listening to one of the project's media files. */
export function MediaScreen({
  project,
  mediaFileId,
  onBack,
}: {
  project: Project;
  mediaFileId: string;
  /** Returns to the project screen. */
  onBack: () => void;
}) {
  const mediaFile = useMediaFile(project.id, mediaFileId);
  if (mediaFile === null)
    return (
      <div
        data-theme="dark"
        className="flex h-dvh flex-col gap-4 bg-canvas p-4 text-fg"
      >
        <Button variant="subtle" className="self-start" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          Project
        </Button>
        <p role="status" className="text-sm text-fg-muted">
          Loading…
        </p>
      </div>
    );
  return (
    <LoadedMediaScreen
      key={mediaFile.id}
      project={project}
      mediaFile={mediaFile}
      onBack={onBack}
    />
  );
}

const nextSubtitleDisplay: Record<SubtitleDisplay, SubtitleDisplay> = {
  both: "target",
  target: "translation",
  translation: "both",
};

const noFlashcards: readonly Flashcard[] = [];

function LoadedMediaScreen({
  project,
  mediaFile,
  onBack,
}: {
  project: Project;
  mediaFile: MediaFile;
  onBack: () => void;
}) {
  const dispatch = useAppDispatch();
  const { openDictionaries } = useNavigationActions();
  const player = useAppSelector(selectPlayer);
  const currentMs = player.currentTimeSeconds * 1000;
  const { settings } = project;
  const [panels, setPanels] = useState({
    cues: true,
    waveform: true,
    distractionFree: false,
  });
  const [subtitleDisplay, setSubtitleDisplay] =
    useState<SubtitleDisplay>("both");
  const subtitles = useSubtitles(project.id, mediaFile, settings);
  useAddChosenSubtitleFile(
    project.id,
    mediaFile.id,
    {
      target: settings.target_language,
      translation: settings.translation_language,
    },
    (role, subtitleFileId) =>
      subtitles.choose(role, fileTrackId(subtitleFileId)),
  );
  const lookup = useLookupPopup(settings.target_language);
  const editing = useFlashcardEditing(project, mediaFile.id);
  const createContent = useFlashcardCreation({
    project,
    mediaFile,
    translationCues: subtitles.translationCues,
    currentMs,
  });
  const flashcards = useMediaFlashcards(project.id, mediaFile.id);
  const editedContent = editing.editing?.state.content ?? null;
  const segments = useMemo(
    () =>
      segmentsOfFlashcards(
        flashcards,
        editing.editing && editedContent
          ? {
              id: editing.editing.flashcardId,
              clip: editedContent.audio_context,
              screenshotMs: editedContent.screenshot?.at_ms ?? null,
            }
          : null,
      ),
    [flashcards, editing.editing, editedContent],
  );
  const savedGestures = useSavedFlashcardGestures(project.id, flashcards);
  useClipLoop(editedContent?.audio_context ?? null, currentMs);
  const activeCue = findCueAt(subtitles.cues, currentMs);
  const startFlashcard = (request: Parameters<typeof createContent>[0]) => {
    lookup.closeWithoutResuming();
    createContent(request).then(editing.startNew);
  };
  const playerCallbacks = usePlayerCallbacks({
    cues: subtitles.cues,
    currentMs,
    durationMs: player.durationSeconds * 1000,
    onToggleSubtitleDisplay: () =>
      setSubtitleDisplay((display) => nextSubtitleDisplay[display]),
    onTogglePanel: (panel) =>
      setPanels((current) => ({ ...current, [panel]: !current[panel] })),
  });
  const screenRef = useRef<HTMLSpanElement>(null);
  useMediaShortcuts(
    {
      onTogglePlay: () => dispatch(actions.playToggleRequested()),
      onLookup: lookup.search,
      onEscape: () => {
        if (lookup.request) lookup.close();
        else if (panels.distractionFree)
          playerCallbacks.onToggleDistractionFree();
      },
    },
    screenRef,
  );
  const popupRef = useRef<HTMLDivElement>(null);
  useDismissOnOutsidePointer(popupRef, lookup.close, lookup.request !== null);
  const lookupEntries =
    lookup.state?.kind === "found" ? lookup.state.entries : null;
  return (
    <>
      <span ref={screenRef} hidden />
      <MediaView
        title={mediaFile.name}
        language={settings.target_language}
        stage={<MediaPlayer projectId={project.id} />}
        playback={{
          isPlaying: player.isPlaying,
          currentMs,
          durationMs: player.durationSeconds * 1000,
          volume: player.volume,
          speed: player.rate,
        }}
        tracks={{
          audio: [],
          subtitles: subtitles.options,
          audioId: null,
          targetSubtitlesId: subtitles.selection.target,
          translationSubtitlesId: subtitles.selection.translation,
        }}
        cues={subtitles.cues}
        translationCues={subtitles.translationCues}
        waveform={
          <PlayerWaveform
            projectId={project.id}
            mediaFileId={mediaFile.id}
            cues={subtitles.cues}
            flashcardSegments={segments}
            segmentHandlers={{
              onOpenFlashcardSegment: (segmentId) => {
                const flashcard = flashcards.find(
                  (candidate) => candidate.id === segmentId,
                );
                if (flashcard) editing.openSaved(flashcard);
              },
              onClipEndpointMoved: (segmentId, endpoint, timeMs) => {
                if (segmentId !== editing.editing?.flashcardId)
                  return savedGestures.moveClipEndpoint(
                    segmentId,
                    endpoint,
                    timeMs,
                  );
                const clip = editedContent?.audio_context;
                if (clip)
                  editing.dispatch({
                    type: "clipChanged",
                    clip: {
                      ...clip,
                      [endpoint === "start" ? "start_ms" : "end_ms"]:
                        Math.round(timeMs),
                    },
                  });
              },
              onScreenshotMarkerMoved: (segmentId, timeMs) =>
                segmentId === editing.editing?.flashcardId
                  ? editing.dispatch({
                      type: "screenshotMsChanged",
                      ms: Math.round(timeMs),
                    })
                  : savedGestures.moveScreenshot(segmentId, timeMs),
            }}
          />
        }
        panels={panels}
        subtitleDisplay={subtitleDisplay}
        activeWord={lookup.request?.term ?? undefined}
        playerCallbacks={playerCallbacks}
        onBack={onBack}
        onWordHover={lookup.hover}
        onWordClick={(word, cue) =>
          startFlashcard({ word, cue, entries: null, entryIndex: null })
        }
        onLookup={lookup.search}
        onAddFlashcard={() =>
          startFlashcard({
            word: "",
            cue: activeCue,
            entries: [],
            entryIndex: null,
          })
        }
        lookup={
          lookup.request && (
            <div ref={popupRef} className="contents">
              <DictionaryPopup
                key={lookup.request.mode}
                state={lookup.state}
                mode={lookup.request.mode}
                onSearch={lookup.submit}
                onCreateFlashcard={(term, entryIndex) =>
                  startFlashcard({
                    word: term,
                    cue: lookup.request?.cue ?? activeCue,
                    entries:
                      term === lookup.request?.term ? lookupEntries : null,
                    entryIndex,
                  })
                }
                onClose={lookup.close}
                onSetUpDictionary={openDictionaries}
              />
            </div>
          )
        }
        sidePanel={
          <MediaSidePanel
            project={project}
            mediaFile={mediaFile}
            subtitles={subtitles}
            showsCues={panels.cues}
            activeCueIndex={activeCue?.index ?? null}
            flashcardCueIndexes={cueIndexesWithFlashcards(
              subtitles.cues,
              segments,
            )}
            activeWord={lookup.request?.term ?? undefined}
            editing={editing}
            onWordHover={lookup.hover}
            onWordClick={(word, cue) =>
              startFlashcard({ word, cue, entries: null, entryIndex: null })
            }
          />
        }
      />
      {subtitles.prompt && (
        <TrackPickerDialog
          purpose="targetSubtitles"
          tracks={subtitles.prompt.options}
          wantedLanguage={settings.target_language}
          onChoose={(trackId) => subtitles.choose("target", trackId)}
          onSkip={subtitles.dismissPrompt}
        />
      )}
    </>
  );
}

/** The project's flashcards made from the media file. */
function useMediaFlashcards(
  projectId: string,
  mediaFileId: string,
): readonly Flashcard[] {
  const { data } = useListFlashcardsQuery(projectId);
  return useMemo(
    () =>
      data?.flashcards.filter(
        (flashcard) => flashcard.media_file_id === mediaFileId,
      ) ?? noFlashcards,
    [data, mediaFileId],
  );
}
