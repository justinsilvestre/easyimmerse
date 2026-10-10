import { useListPluginsQuery } from "@easyimmerse/backend";
import {
  actions,
  selectDialog,
  selectMediaPanels,
  selectPlayer,
  selectPlayerControls,
  selectPreference,
  selectShownCue,
} from "@easyimmerse/state";
import type { Cue, Project } from "@easyimmerse/types";
import { useMemo, useRef, useState } from "react";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { LineStep } from "../components/cursorKeys.ts";
import { PlayerWaveform } from "../components/PlayerWaveform.tsx";
import { draftFromCue } from "../flashcards/draftFromCue.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { isAwaitingLookup, saveStatusOf } from "../flashcards/saveStage.ts";
import { useClipWaveform } from "../flashcards/useClipWaveform.ts";
import { useMediaFlashcards } from "../flashcards/useMediaFlashcards.ts";
import { useScreenshotSource } from "../flashcards/useScreenshotSource.ts";
import { useScreenshotUrl } from "../flashcards/useScreenshotUrl.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useFullscreen } from "../hooks/useFullscreen.ts";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import { useStableCallbacks } from "../hooks/useStableCallbacks.ts";
import type { ItemSpan } from "../hooks/useVisibleItemSpan.ts";
import { AnchoredPopup } from "../lookup/AnchoredPopup.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { StartFlashcardFromLookup } from "../lookup/lookupPlace.ts";
import { useLookupPrefetch } from "../lookup/useLookupPrefetch.ts";
import { useSubtitleLookup } from "../lookup/useSubtitleLookup.ts";
import { wordLookupsIn } from "../lookup/wordLookupsIn.ts";
import { cuesToPrefetch } from "../media/cuesToPrefetch.ts";
import { findAdjacentCue, findTranslationOf } from "../media/findCue.ts";
import { flashcardWordRanges } from "../media/flashcardWordRanges.ts";
import { MediaView } from "../media/MediaView.tsx";
import { mediaSourceOf } from "../media/mediaSourceOf.ts";
import type { PlayerCallbacks } from "../media/PlayerControls.tsx";
import type { SubtitleTrackChoices } from "../media/SubtitleTrackChoices.ts";
import { replayTarget, skipTarget } from "../media/skipTarget.ts";
import { parseSubtitleAppearance } from "../media/subtitleAppearance.ts";
import { usePlayerShortcuts } from "../media/usePlayerShortcuts.ts";
import { MediaPlayer } from "../player/MediaPlayer.tsx";
import { selectCanChooseTracks } from "../player/selectCanChooseTracks.ts";
import { useMediaDurationMs } from "../player/useMediaDurationMs.ts";
import { useMediaFile } from "../player/useMediaFile.ts";
import { SourceMediaDialog } from "../subtitles/SourceMediaDialog.tsx";
import { SubtitlesSidePanel } from "../subtitles/SubtitlesSidePanel.tsx";
import { useMediaSubtitles } from "../subtitles/useMediaSubtitles.ts";
import { useSourceMedia } from "../subtitles/useSourceMedia.ts";

/**
 * The screen for watching or listening to one of the project's media files:
 * the player with its subtitles and waveform, and the flashcard editor beside it while a card is open.
 * Clicking a word in the subtitles looks it up in the dictionary pop-up, which pauses playback while it is open;
 * double-clicking a word saves a flashcard for it at once, without opening the editor, as do the pop-up's flashcard buttons
 * and the New flashcard button, which makes one for no word from the cue shown now. A card open in the editor stays open meanwhile.
 * Space or K plays and pauses, Left and Right skip between cues, R replays the cue shown now, M mutes, and F fills the screen,
 * as does double-clicking the picture. While a word of the subtitles has focus, Left and Right move the lookup cursor instead,
 * and Up and Down skip to the previous or next cue. L looks up from the cursor, wherever the mouse or the keyboard put it;
 * C saves a flashcard from the cursor as a double-click there would, or as the New flashcard button would when there is no cursor;
 * and E makes the same flashcard but opens it in the editor instead, unless a card is open there already.
 * The file resumes where playback last was, as `updateResume` in the state package describes.
 * Opening a flashcard seeks to its clip, which loops while playing, as `updateClipLoop` in the state package describes.
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
  const controls = useAppSelector(selectPlayerControls);
  const currentMs = player.currentTimeSeconds * 1000;
  const durationMs = useMediaDurationMs(projectId, mediaFile);
  const screenshotSource = useScreenshotSource(projectId, mediaFile);
  const subtitles = useMediaSubtitles(projectId, mediaFileId);
  const source = mediaSourceOf(
    mediaFile?.origin ?? null,
    useListPluginsQuery().data?.plugins,
  );
  const sourceMedia = useSourceMedia(projectId, mediaFileId);
  const shownCue = useAppSelector((state) =>
    selectShownCue(state, subtitles.cues),
  );
  const hasScreenshots = screenshotSource !== null;
  const flashcards = useMediaFlashcards(projectId, mediaFileId, hasScreenshots);
  const panels = useAppSelector(selectMediaPanels);
  const isSubtitleAppearanceOpen =
    useAppSelector(selectDialog)?.kind === "subtitleAppearance";
  // Computed once per change of either list, so that each cue's ranges keep their identity and its memoised card does not render again.
  const wordRanges = useMemo(
    () => flashcardWordRanges(flashcards.flashcards, subtitles.cues),
    [flashcards.flashcards, subtitles.cues],
  );
  const storedAppearance = useAppSelector(
    selectPreference("subtitleAppearance"),
  );
  const subtitleAppearance = useMemo(
    () => parseSubtitleAppearance(storedAppearance),
    [storedAppearance],
  );
  const editedContent = flashcards.edited?.editor.content;
  const isEditorOpen = flashcards.edited !== null;
  const fullscreen = useFullscreen();
  // Passed through MediaView to the panel toggles, which mark the subtitles panel's toggle unavailable meanwhile.
  const shownPanels = {
    ...panels,
    isCuePanelTakenByEditor: isEditorOpen,
    isFullscreen: fullscreen.isFullscreen,
  };
  const canChooseTracks = useAppSelector(selectCanChooseTracks);
  const clipWaveform = useClipWaveform(
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
   * Hands `start` a flashcard for a word from its cue, or else from the cue at the current time,
   * filled from its lookup now or, through `lateFields`, once the lookup answers.
   */
  const flashcardStarter =
    (start: typeof flashcards.start): StartFlashcardFromLookup =>
    (word, place, lookupFields, lateFields) => {
      if (mediaFile === null) return;
      const cue = place?.source.kind === "cue" ? place.source.cue : shownCue;
      const draft = draftFromCue({
        word,
        wordStart: place?.start ?? null,
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
      start(started, lateFields);
    };
  const createFlashcard = flashcardStarter(flashcards.create);
  const openNewFlashcard = flashcardStarter(flashcards.start);
  const languages = {
    target: settings.target_language,
    translation: settings.translation_language,
  };
  const [panelSpan, setPanelSpan] = useState<ItemSpan | null>(null);
  useLookupPrefetch(
    languages.target,
    cuesToPrefetch(subtitles.cues, { shownCue, currentMs, panelSpan }).map(
      (cue) => stripMarkup(cue.text),
    ),
    wordLookupsIn,
  );
  const screenRef = useRef<HTMLDivElement>(null);
  const lookup = useSubtitleLookup(
    languages,
    { save: createFlashcard, editor: openNewFlashcard },
    screenRef,
  );
  useKeyboardShortcut(
    "e",
    () => {
      if (!isEditorOpen) lookup.startFlashcardAtCursor("editor");
    },
    screenRef,
  );
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
    onToggleMute: () => dispatch(actions.muteToggleRequested()),
    onSpeedChange: (speed) => dispatch(actions.speedChangeRequested(speed)),
    onToggleSubtitleDisplay: () => dispatch(actions.subtitleDisplayCycled()),
    onToggleSubtitles: () => dispatch(actions.subtitlesToggled()),
    onOpenSubtitleAppearance: () =>
      dispatch(actions.subtitleAppearanceOpened()),
    // The editor takes the side panel while a card is open. Transitional until the open card is in the store.
    onToggleCuePanel: () => {
      if (!isEditorOpen) dispatch(actions.cuePanelToggled());
    },
    onToggleWaveform: () => dispatch(actions.waveformToggled()),
    onToggleFullscreen: fullscreen.isSupported ? fullscreen.toggle : undefined,
    onOpenTracks: canChooseTracks
      ? () => dispatch(actions.trackChoiceRequested())
      : undefined,
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
  const cueSteps = useStableCallbacks({
    step: (cue: Cue, step: LineStep) => {
      const adjacent = findAdjacentCue(subtitles.cues, cue, step);
      if (adjacent) dispatch(actions.seekRequested(adjacent.start_ms / 1000));
    },
  });
  return (
    <>
      {sourceMedia.isOpen && source && (
        <SourceMediaDialog
          title={source.title}
          form={sourceMedia.form}
          isBusy={sourceMedia.isBusy}
          error={sourceMedia.error}
          onAction={sourceMedia.act}
          onClose={sourceMedia.close}
        />
      )}
      <MediaView
        ref={screenRef}
        media={{
          title: mediaFile?.name ?? "",
          projectName: settings.name,
          source,
        }}
        stage={<MediaPlayer projectId={projectId} />}
        playback={{
          isPlaying: player.isPlaying,
          currentMs,
          durationMs,
          buffered: player.buffered,
          volume: controls.volume,
          isMuted: controls.isMuted,
          speed: controls.speed,
        }}
        tracks={tracks}
        cues={subtitles.cues}
        translationCues={subtitles.translationCues}
        shownCue={shownCue}
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
          />
        }
        panels={shownPanels}
        subtitleDisplay={panels.subtitleDisplay}
        subtitleAppearance={subtitleAppearance}
        isSubtitleAppearanceOpen={isSubtitleAppearanceOpen}
        onSubtitleAppearanceChange={(appearance) =>
          dispatch(
            actions.preferenceSet(
              "subtitleAppearance",
              JSON.stringify(appearance),
            ),
          )
        }
        onCloseSubtitleAppearance={() =>
          dispatch(actions.subtitleAppearanceClosed())
        }
        flashcardWordRanges={wordRanges}
        playerCallbacks={playerCallbacks}
        onBack={() => dispatch(actions.closeMedia())}
        onOpenSource={sourceMedia.open}
        activeWord={lookup.activeWord}
        cursor={lookup.cursor}
        wordGestures={lookup.wordGestures}
        onCueStep={cueSteps.step}
        onLookup={lookup.openSearch}
        onAddFlashcard={() => createFlashcard("", null, null)}
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
              isAwaitingLookup={isAwaitingLookup(flashcards.edited.stage)}
              hasSaveFailed={flashcards.saveFailed}
              onSave={flashcards.save}
              onDelete={flashcards.remove}
              onClose={flashcards.close}
            />
          ) : panels.cues ? (
            <SubtitlesSidePanel
              subtitles={subtitles}
              tracks={tracks}
              languages={languages}
              shownCue={shownCue}
              flashcardCueIndexes={flashcards.cueIndexes}
              flashcardWordRanges={wordRanges}
              activeWord={lookup.activeWord}
              cursor={lookup.cursor}
              wordGestures={lookup.wordGestures}
              onOpenFlashcardForCue={flashcards.openForCue}
              onVisibleCuesChange={setPanelSpan}
            />
          ) : undefined
        }
      />
    </>
  );
}
