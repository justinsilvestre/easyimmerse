import { actions, selectPlayer } from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { useReducer, useRef } from "react";
import { PlayerWaveform } from "../components/PlayerWaveform.tsx";
import { cueForFlashcard, draftFromCue } from "../flashcards/draftFromCue.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { FlashcardSaveNotice } from "../flashcards/FlashcardSaveNotice.tsx";
import { useClipWaveform } from "../flashcards/useClipWaveform.ts";
import { useMediaFlashcards } from "../flashcards/useMediaFlashcards.ts";
import { useScreenshotSource } from "../flashcards/useScreenshotSource.ts";
import { useScreenshotUrl } from "../flashcards/useScreenshotUrl.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { useSubtitleLookup } from "../lookup/useSubtitleLookup.ts";
import { findTranslationOf } from "../media/findCue.ts";
import { MediaView } from "../media/MediaView.tsx";
import { initialMediaPanels, reduceMediaPanels } from "../media/mediaPanels.ts";
import type { PlayerCallbacks } from "../media/PlayerControls.tsx";
import type { SubtitleTrackChoices } from "../media/SubtitleTrackChoices.ts";
import { skipTarget } from "../media/skipTarget.ts";
import { MediaPlayer } from "../player/MediaPlayer.tsx";
import { useMediaDurationMs } from "../player/useMediaDurationMs.ts";
import { useMediaFile } from "../player/useMediaFile.ts";
import { SubtitlesSidePanel } from "../subtitles/SubtitlesSidePanel.tsx";
import { useMediaSubtitles } from "../subtitles/useMediaSubtitles.ts";

/**
 * The screen for watching or listening to one of the project's media files:
 * the player with its subtitles and waveform, and the flashcard editor beside it while a card is open.
 * Clicking a word in the subtitles looks it up in the dictionary pop-up, which pauses playback while it is open;
 * double-clicking a word starts a flashcard for it at once.
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
  const startFlashcard = (
    word: string,
    cue = cueForFlashcard(subtitles.cues, currentMs),
    lookupFields: LookupFlashcardFields | null = null,
  ) => {
    if (mediaFile === null) return;
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
    flashcards.start(
      lookupFields
        ? { ...draft, content: { ...draft.content, ...lookupFields } }
        : draft,
    );
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
    onToggleCuePanel: () => dispatchPanels({ type: "cuePanelToggled" }),
    onToggleWaveform: () => dispatchPanels({ type: "waveformToggled" }),
    onToggleDistractionFree: () =>
      dispatchPanels({ type: "distractionFreeToggled" }),
  };
  return (
    <MediaView
      ref={screenRef}
      media={{
        title: mediaFile?.name ?? "",
        language: settings.target_language,
      }}
      stage={<MediaPlayer projectId={projectId} />}
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
          segmentHandlers={{
            onOpenFlashcardSegment: flashcards.open,
            onClipEndpointMoved: flashcards.moveClipEndpoint,
            onScreenshotMarkerMoved: flashcards.moveScreenshot,
          }}
          onHide={() => dispatchPanels({ type: "waveformToggled" })}
        />
      }
      panels={panels}
      subtitleDisplay={panels.subtitleDisplay}
      playerCallbacks={playerCallbacks}
      onBack={() => dispatch(actions.closeMedia())}
      activeWord={lookup.activeWord}
      wordGestures={lookup.wordGestures}
      onLookup={lookup.openSearch}
      onAddFlashcard={() => startFlashcard("")}
      lookup={lookup.popupProps && <DictionaryPopup {...lookup.popupProps} />}
      headerContent={
        flashcards.isSaved ? (
          <FlashcardSaveNotice
            outcome="savedInProject"
            onDismiss={flashcards.dismissSaved}
          />
        ) : undefined
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
          />
        ) : undefined
      }
    />
  );
}
