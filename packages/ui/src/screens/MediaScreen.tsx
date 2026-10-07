import { actions, selectPlayer } from "@easyimmerse/state";
import type { Cue, Project } from "@easyimmerse/types";
import { useCallback, useReducer, useRef, useState } from "react";
import { PlayerWaveform } from "../components/PlayerWaveform.tsx";
import { cueForFlashcard, draftFromCue } from "../flashcards/draftFromCue.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { saveStatusOf } from "../flashcards/saveStage.ts";
import { useClipWaveform } from "../flashcards/useClipWaveform.ts";
import { useMediaFlashcards } from "../flashcards/useMediaFlashcards.ts";
import { useScreenshotSource } from "../flashcards/useScreenshotSource.ts";
import { useScreenshotUrl } from "../flashcards/useScreenshotUrl.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useFullscreen } from "../hooks/useFullscreen.ts";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import { AnchoredPopup } from "../lookup/AnchoredPopup.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { useSubtitleLookup } from "../lookup/useSubtitleLookup.ts";
import { findTranslationOf } from "../media/findCue.ts";
import { MediaView } from "../media/MediaView.tsx";
import { initialMediaPanels, reduceMediaPanels } from "../media/mediaPanels.ts";
import type { PlayerCallbacks } from "../media/PlayerControls.tsx";
import type { SubtitleTrackChoices } from "../media/SubtitleTrackChoices.ts";
import { replayTarget, skipTarget } from "../media/skipTarget.ts";
import { useClipLoop } from "../media/useClipLoop.ts";
import { usePlayerShortcuts } from "../media/usePlayerShortcuts.ts";
import { MediaPlayer } from "../player/MediaPlayer.tsx";
import { TrackChoiceContext } from "../player/trackChoiceContext.ts";
import { useMediaDurationMs } from "../player/useMediaDurationMs.ts";
import { useMediaFile } from "../player/useMediaFile.ts";
import { SubtitlesSidePanel } from "../subtitles/SubtitlesSidePanel.tsx";
import { useMediaSubtitles } from "../subtitles/useMediaSubtitles.ts";

/**
 * The screen for watching or listening to one of the project's media files:
 * the player with its subtitles and waveform, and the flashcard editor beside it while a card is open.
 * Clicking a word in the subtitles looks it up in the dictionary pop-up, which pauses playback while it is open;
 * double-clicking a word starts a flashcard for it at once.
 * Space or K plays and pauses, the arrow keys skip between cues, R replays the cue shown now, F fills the screen,
 * and Escape leaves distraction-free mode once the dictionary pop-up is closed.
 * Opening a flashcard seeks to its clip, which loops while playing, as `useClipLoop` describes.
 * While a card is open the editor takes the side panel, so the subtitles panel's toggle is unavailable until it closes.
 */
export function MediaScreen({
  project,
  mediaFileId,
}: {
  project: Project;
  mediaFileId: string;
}) {
  const dispatch = useAppDispatch();
  const projectId = project.id;
  const { settings } = project;
  const mediaFile = useMediaFile(projectId, mediaFileId);
  const player = useAppSelector(selectPlayer);
  const currentMs = player.currentTimeSeconds * 1000;
  const durationMs = useMediaDurationMs(projectId, mediaFile);
  const screenshotSource = useScreenshotSource(projectId, mediaFile);
  const subtitles = useMediaSubtitles(projectId, mediaFileId);
  const hasScreenshots = screenshotSource !== null;
  const flashcards = useMediaFlashcards(projectId, mediaFileId, hasScreenshots);
  const [panels, dispatchPanels] = useReducer(
    reduceMediaPanels,
    initialMediaPanels,
  );
  const editedContent = flashcards.edited?.editor.content;
  useClipLoop(
    flashcards.edited?.session ?? null,
    editedContent?.audio_context ?? null,
    { isPlaying: player.isPlaying, currentMs },
    (ms) => dispatch(actions.seekRequested(ms / 1000)),
  );
  const isEditorOpen = flashcards.edited !== null;
  const fullscreen = useFullscreen();
  // Passed through MediaView to the player controls, which mark the subtitles panel's toggle unavailable meanwhile.
  const shownPanels = {
    ...panels,
    isCuePanelTakenByEditor: isEditorOpen,
    isFullscreen: fullscreen.isFullscreen,
  };
  // The player offers the track choice once it knows the file's tracks; the control bar shows a Tracks button meanwhile.
  const [openTracks, setOpenTracks] = useState<(() => void) | null>(null);
  const offerTrackChoice = useCallback(
    (open: (() => void) | null) => setOpenTracks(() => open),
    [],
  );
  const clipWaveform = useClipWaveform(
    projectId,
    mediaFile,
    durationMs,
    editedContent?.audio_context ?? null,
  );
  const screenshotUrl = useScreenshotUrl(
    screenshotSource,
    editedContent?.screenshot?.at_ms ?? null,
  );
  const tracks: SubtitleTrackChoices = {
    subtitles: subtitles.options,
    targetSubtitlesId: subtitles.selection.target_track_id,
    translationSubtitlesId: subtitles.selection.translation_track_id,
  };
  /**
   * Starts a flashcard for a word from its cue, or else from the cue at the current time,
   * filled from its lookup now or, through `lateFields`, once the lookup answers.
   */
  const startFlashcard = (
    word: string,
    wordCue: Cue | null,
    lookupFields: LookupFlashcardFields | null,
    lateFields?: Promise<LookupFlashcardFields | null>,
  ) => {
    if (mediaFile === null) return;
    const cue = wordCue ?? cueForFlashcard(subtitles.cues, currentMs);
    const draft = draftFromCue({
      word,
      cue,
      translationCue: cue
        ? findTranslationOf(cue, subtitles.translationCues)
        : null,
      mediaFile,
      settings,
      hasScreenshots,
    });
    const started = lookupFields
      ? { ...draft, content: { ...draft.content, ...lookupFields } }
      : draft;
    flashcards.start(started, lateFields);
  };
  const languages = {
    target: settings.target_language,
    translation: settings.translation_language,
  };
  const screenRef = useRef<HTMLDivElement>(null);
  const lookup = useSubtitleLookup(languages, startFlashcard, screenRef);
  const playerCallbacks: PlayerCallbacks = {
    onTogglePlay: () => dispatch(actions.playToggleRequested()),
    onSeek: (ms) => dispatch(actions.seekRequested(ms / 1000)),
    onSkip: (direction) =>
      dispatch(
        actions.seekRequested(
          skipTarget(subtitles.cues, currentMs, durationMs, direction) / 1000,
        ),
      ),
    onVolumeChange: (volume) => dispatch(actions.volumeChangeRequested(volume)),
    onSpeedChange: (speed) => dispatch(actions.speedChangeRequested(speed)),
    onToggleSubtitleDisplay: () =>
      dispatchPanels({ type: "subtitleDisplayCycled" }),
    onToggleCuePanel: () => {
      if (!isEditorOpen) dispatchPanels({ type: "cuePanelToggled" });
    },
    onToggleWaveform: () => dispatchPanels({ type: "waveformToggled" }),
    onToggleDistractionFree: () =>
      dispatchPanels({ type: "distractionFreeToggled" }),
    onToggleFullscreen: fullscreen.isSupported ? fullscreen.toggle : undefined,
    onOpenTracks: openTracks ?? undefined,
  };
  usePlayerShortcuts(
    {
      ...playerCallbacks,
      onReplay: () =>
        dispatch(
          actions.seekRequested(replayTarget(subtitles.cues, currentMs) / 1000),
        ),
    },
    screenRef,
  );
  useKeyboardShortcut("f", fullscreen.toggle, screenRef);
  useKeyboardShortcut(
    "Escape",
    () => {
      if (panels.distractionFree && lookup.popup === null)
        dispatchPanels({ type: "distractionFreeToggled" });
    },
    screenRef,
  );
  return (
    <MediaView
      ref={screenRef}
      media={{
        title: mediaFile?.name ?? "",
        language: settings.target_language,
        projectName: settings.name,
      }}
      stage={
        <TrackChoiceContext value={offerTrackChoice}>
          <MediaPlayer projectId={projectId} />
        </TrackChoiceContext>
      }
      playback={{
        isPlaying: player.isPlaying,
        currentMs,
        durationMs,
        volume: player.volume,
        speed: player.speed,
      }}
      tracks={tracks}
      cues={subtitles.cues}
      translationCues={subtitles.translationCues}
      waveform={
        <PlayerWaveform
          projectId={projectId}
          mediaFileId={mediaFileId}
          cues={subtitles.cues}
          flashcardSegments={flashcards.segments}
          editableSegmentId={flashcards.editedSegmentId}
          segmentHandlers={{
            onOpenFlashcardSegment: flashcards.open,
            onClipEndpointMoved: flashcards.moveClipEndpoint,
            onScreenshotMarkerMoved: flashcards.moveScreenshot,
          }}
          onHide={() => dispatchPanels({ type: "waveformToggled" })}
        />
      }
      panels={shownPanels}
      subtitleDisplay={panels.subtitleDisplay}
      playerCallbacks={playerCallbacks}
      onBack={() => dispatch(actions.closeMedia())}
      activeWord={lookup.activeWord}
      wordGestures={lookup.wordGestures}
      onLookup={lookup.openSearch}
      onAddFlashcard={() => startFlashcard("", null, null)}
      lookup={
        lookup.popup && (
          <AnchoredPopup {...lookup.popup.anchored}>
            <DictionaryPopup {...lookup.popup.props} />
          </AnchoredPopup>
        )
      }
      sidePanel={
        flashcards.edited !== null ? (
          <FlashcardEditor
            key={
              flashcards.edited.kind === "new"
                ? "new"
                : flashcards.edited.flashcard.id
            }
            state={flashcards.edited.editor}
            dispatch={flashcards.edit}
            languages={languages}
            waveform={clipWaveform}
            screenshotUrl={screenshotUrl}
            saveStatus={saveStatusOf(flashcards.edited.stage)}
            isNew={flashcards.edited.kind === "new"}
            hasSaveFailed={flashcards.saveFailed}
            onSave={flashcards.save}
            onDelete={flashcards.remove}
            onClose={flashcards.close}
          />
        ) : panels.cues ? (
          <SubtitlesSidePanel
            subtitles={subtitles}
            tracks={tracks}
            currentMs={currentMs}
            flashcardCueIndexes={flashcards.cueIndexes}
            activeWord={lookup.activeWord}
            wordGestures={lookup.wordGestures}
            onOpenFlashcardForCue={flashcards.openForCue}
          />
        ) : undefined
      }
    />
  );
}
