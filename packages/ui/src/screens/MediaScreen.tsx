import { useListPluginsQuery } from "@easyimmerse/backend";
import {
  actions,
  selectCuePanelSpan,
  selectIsSubtitleAppearanceOpen,
  selectMediaKeyBinding,
  selectMediaPanels,
  selectShownCue,
  selectSourceMedia,
  transientNotice,
} from "@easyimmerse/state";
import type { Cue, Project } from "@easyimmerse/types";
import { useMemo } from "react";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { LineStep } from "../components/cursorKeys.ts";
import { PlayerWaveform } from "../components/PlayerWaveform.tsx";
import { ConnectedFlashcardEditor } from "../flashcards/ConnectedFlashcardEditor.tsx";
import { draftFromCue } from "../flashcards/draftFromCue.ts";
import { useClipWaveform } from "../flashcards/useClipWaveform.ts";
import { useMediaFlashcards } from "../flashcards/useMediaFlashcards.ts";
import { useScreenshotSource } from "../flashcards/useScreenshotSource.ts";
import { useScreenshotUrl } from "../flashcards/useScreenshotUrl.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useFullscreen } from "../hooks/useFullscreen.ts";
import { useKeyBindings } from "../hooks/useKeyBindings.ts";
import { useStableCallbacks } from "../hooks/useStableCallbacks.ts";
import { AnchoredPopup } from "../lookup/AnchoredPopup.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { LookupPlace } from "../lookup/lookupPlace.ts";
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
import { selectMediaPlayback } from "../media/selectMediaPlayback.ts";
import { selectSubtitleAppearance } from "../media/selectSubtitleAppearance.ts";
import { replayTarget, skipTarget } from "../media/skipTarget.ts";
import { MediaPlayer } from "../player/MediaPlayer.tsx";
import { selectCanChooseTracks } from "../player/selectCanChooseTracks.ts";
import { useMediaFile } from "../player/useMediaFile.ts";
import { SourceMediaDialog } from "../subtitles/SourceMediaDialog.tsx";
import { SubtitlesSidePanel } from "../subtitles/SubtitlesSidePanel.tsx";
import { useMediaSubtitles } from "../subtitles/useMediaSubtitles.ts";

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
 * and E makes the same flashcard but opens it in the editor instead, unless a card is open there already,
 * as `selectMediaKeyBinding` in the state package describes.
 * The file resumes where playback last was, as `resume` in the state package describes.
 * Opening a flashcard seeks to its clip, which loops while playing, as `playOpenedCard` in the state package describes.
 * While a card is open the editor takes the side panel, so the store keeps the subtitles panel's toggle unavailable until it closes.
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
  const playback = useAppSelector(selectMediaPlayback);
  const { currentMs, durationMs } = playback;
  const screenshotSource = useScreenshotSource(projectId, mediaFile);
  const subtitles = useMediaSubtitles(projectId, mediaFileId);
  const source = mediaSourceOf(
    mediaFile?.origin ?? null,
    useListPluginsQuery().data?.plugins,
  );
  const sourceMedia = useAppSelector(selectSourceMedia);
  const shownCue = useAppSelector((state) =>
    selectShownCue(state, subtitles.cues),
  );
  const hasScreenshots = screenshotSource !== null;
  const flashcards = useMediaFlashcards(projectId, mediaFileId);
  const panels = useAppSelector(selectMediaPanels);
  const isSubtitleAppearanceOpen = useAppSelector(
    selectIsSubtitleAppearanceOpen,
  );
  // Computed once per change of either list, so that each cue's ranges keep their identity and its memoised card does not render again.
  const wordRanges = useMemo(
    () => flashcardWordRanges(flashcards.flashcards, subtitles.cues),
    [flashcards.flashcards, subtitles.cues],
  );
  const subtitleAppearance = useAppSelector(selectSubtitleAppearance);
  const { form } = flashcards;
  const editedContent = form?.card.editor.content;
  const isEditorOpen = form !== null;
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
  /** The draft of a flashcard for a word from its cue, or else from the cue at the current time, or null until the file's record arrives. */
  const draftFor = (word: string, place: LookupPlace | null) => {
    if (mediaFile === null) return null;
    const cue = place?.source.kind === "cue" ? place.source.cue : shownCue;
    return draftFromCue({
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
  };
  const languages = {
    target: settings.target_language,
    translation: settings.translation_language,
  };
  const panelSpan = useAppSelector(selectCuePanelSpan);
  useLookupPrefetch(
    languages.target,
    cuesToPrefetch(subtitles.cues, { shownCue, currentMs, panelSpan }).map(
      (cue) => stripMarkup(cue.text),
    ),
    wordLookupsIn,
  );
  const lookup = useSubtitleLookup(languages, {
    draftFor,
    savesAtOnce: true,
  });
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
    onToggleCuePanel: () => dispatch(actions.cuePanelToggled()),
    onToggleWaveform: () => dispatch(actions.waveformToggled()),
    onToggleFullscreen: fullscreen.isSupported ? fullscreen.toggle : undefined,
    onOpenTracks: canChooseTracks
      ? () => dispatch(actions.trackChoiceRequested())
      : undefined,
  };
  useKeyBindings(selectMediaKeyBinding, {
    skipCue: ({ direction }) => playerCallbacks.onSkip(direction),
    replayCue: () =>
      dispatch(
        actions.seekRequested(replayTarget(subtitles.cues, currentMs) / 1000),
      ),
    toggleFullscreen: fullscreen.toggle,
    startFlashcardAtCursor: ({ destination }) =>
      lookup.startFlashcardAtCursor(destination),
  });
  const cueSteps = useStableCallbacks({
    step: (cue: Cue, step: LineStep) => {
      const adjacent = findAdjacentCue(subtitles.cues, cue, step);
      if (adjacent) dispatch(actions.seekRequested(adjacent.start_ms / 1000));
    },
  });
  return (
    <>
      {sourceMedia && source && (
        <SourceMediaDialog
          title={source.title}
          form={sourceMedia.form}
          isBusy={sourceMedia.isBusy}
          error={sourceMedia.error}
          onAction={(actionId, input) =>
            dispatch(actions.sourceMediaStepTaken(actionId, input))
          }
          onClose={() => dispatch(actions.sourceMediaClosed())}
        />
      )}
      <MediaView
        media={{
          title: mediaFile?.name ?? "",
          projectName: settings.name,
          source,
        }}
        stage={<MediaPlayer projectId={projectId} />}
        playback={playback}
        tracks={tracks}
        cues={subtitles.cues}
        translationCues={subtitles.translationCues}
        shownCue={shownCue}
        waveform={
          <PlayerWaveform
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
        onOpenSource={() => dispatch(actions.sourceMediaOpened())}
        activeWord={lookup.activeWord}
        cursor={lookup.cursor}
        wordGestures={lookup.wordGestures}
        onCueStep={cueSteps.step}
        onLookup={lookup.openSearch}
        onAddFlashcard={() => lookup.startWordlessFlashcard("save")}
        lookup={
          lookup.popup && (
            <AnchoredPopup {...lookup.popup.anchored}>
              <DictionaryPopup {...lookup.popup.props} />
            </AnchoredPopup>
          )
        }
        sidePanel={
          form !== null ? (
            <ConnectedFlashcardEditor
              languages={languages}
              waveform={clipWaveform}
              screenshotUrl={screenshotUrl}
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
              onSeek={playerCallbacks.onSeek}
              onGenerateSubtitles={() =>
                dispatch(
                  actions.noticeRequested(
                    transientNotice(
                      "info",
                      "Generating subtitles is not available yet.",
                    ),
                  ),
                )
              }
              onVisibleCuesChange={(span) =>
                dispatch(actions.cuePanelSpanMeasured(span))
              }
            />
          ) : undefined
        }
      />
    </>
  );
}
