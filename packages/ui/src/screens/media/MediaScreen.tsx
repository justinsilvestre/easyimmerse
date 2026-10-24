import { useListPluginsQuery } from "@easyimmerse/backend";
import type { LookupSource } from "@easyimmerse/state";
import {
  actions,
  draftFromCue,
  findTranslationOf,
  selectCanChooseTracks,
  selectIsSubtitleAppearanceOpen,
  selectMediaKeyBinding,
  selectMediaPanels,
  selectPlayer,
  selectShownCue,
  selectSourceMedia,
  stripMarkup,
  transientNotice,
} from "@easyimmerse/state";
import type { Cue, Project } from "@easyimmerse/types";
import { useMemo } from "react";
import { AnchoredPopup } from "../../components/dictionaryPopup/AnchoredPopup.tsx";
import { DictionaryPopup } from "../../components/dictionaryPopup/DictionaryPopup.tsx";
import type { SentenceRowSource } from "../../components/dictionaryPopup/sentenceRowSource.ts";
import { useScreenshotSource } from "../../components/flashcards/useScreenshotSource.ts";
import { LibraryEditingBar } from "../../components/libraryEditing/LibraryEditingBar.tsx";
import { MediaPlayer } from "../../components/player/MediaPlayer.tsx";
import { selectSubtitleAppearance } from "../../components/subtitleAppearance/selectSubtitleAppearance.ts";
import type { LineStep } from "../../components/wordLookup/cursorKeys.ts";
import type { LibraryItemText } from "../../components/wordLookup/libraryWords.ts";
import type { LookupPlace } from "../../components/wordLookup/lookupPlace.ts";
import { useLookupPrefetch } from "../../components/wordLookup/useLookupPrefetch.ts";
import { wordLookupsIn } from "../../components/wordLookup/wordLookupsIn.ts";
import { useKeyBindings } from "../../lib/useKeyBindings.ts";
import { useStableCallbacks } from "../../lib/useStableCallbacks.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { ConnectedPlayerControls } from "./ConnectedPlayerControls.tsx";
import { findAdjacentCue } from "./findCue.ts";
import { flashcardWordRanges } from "./flashcardWordRanges.ts";
import { MediaFlashcardEditor } from "./MediaFlashcardEditor.tsx";
import { MediaView } from "./MediaView.tsx";
import { mediaSourceOf } from "./mediaSourceOf.ts";
import type { PlayerCallbacks } from "./PlayerControls.tsx";
import { PlayerWaveform } from "./PlayerWaveform.tsx";
import { SourceMediaDialog } from "./SourceMediaDialog.tsx";
import { SubtitlesSidePanel } from "./SubtitlesSidePanel.tsx";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";
import { selectCuesToPrefetch } from "./selectCuesToPrefetch.ts";
import { useFullscreen } from "./useFullscreen.ts";
import { useMediaFile } from "./useMediaFile.ts";
import { useMediaFlashcards } from "./useMediaFlashcards.ts";
import { useMediaSubtitles } from "./useMediaSubtitles.ts";
import { useSubtitleLookup } from "./useSubtitleLookup.ts";

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
 * A held tap or held mouse button on a word opens the pop-up with its cue's translation in the sentence row, as does T,
 * when the translation subtitles are not shown over the video or in the subtitles panel; the row also replays the cue.
 * The file resumes where playback last was, as `resume` in the state package describes.
 * Opening a flashcard seeks to its clip, which loops while playing, as `playOpenedCard` in the state package describes.
 * While a card is open the editor takes the side panel, so the store keeps the subtitles panel's toggle unavailable until it closes.
 * A file from the library takes its cues from its item's text, where only the stored words are clickable,
 * the pop-up shows each word's stored entry without looking it up, and every flashcard is a library flashcard.
 * Its subtitles cannot change, so the subtitles panel offers no tracks, and its audio tracks are those its library manager prepared.
 * While a library manager prepares the item, every word can be clicked and any text selected, the stored words are underlined,
 * the pop-up gives the text an entry for learners, as `useWordLookup` describes, and no flashcard is made;
 * a bar above the stage leads back to the item's details, as does the way back.
 */
export function MediaScreen({
  project,
  mediaFileId,
  library,
}: {
  project: Project;
  mediaFileId: string;
  /** The library item the file comes from, with its text, or unset for a file from anywhere else. */
  library?: LibraryItemText;
}) {
  const dispatch = useAppDispatch();
  const projectId = project.id;
  const { settings } = project;
  const mediaFile = useMediaFile(projectId, mediaFileId);
  const isPlaying = useAppSelector((state) => selectPlayer(state).isPlaying);
  const screenshotSource = useScreenshotSource(projectId, mediaFile);
  const subtitles = useMediaSubtitles(projectId, mediaFileId, library);
  const isEditing = library?.isEditing ?? false;
  const navigate = useNavigate();
  const openDetails = () =>
    library && navigate({ type: "editLibraryItem", itemId: library.item.id });
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
  const flashcardRanges = useMemo(
    () => flashcardWordRanges(flashcards.flashcards, subtitles.cues),
    [flashcards.flashcards, subtitles.cues],
  );
  const wordRanges = subtitles.markedWords ?? flashcardRanges;
  const markedWordTitle = isEditing ? "Has an entry for learners" : undefined;
  const subtitleAppearance = useAppSelector(selectSubtitleAppearance);
  const isEditorOpen = flashcards.editedSegmentId !== null;
  const fullscreen = useFullscreen();
  // Passed through MediaView to the panel toggles, which mark the subtitles panel's toggle unavailable meanwhile.
  const shownPanels = {
    ...panels,
    isCuePanelTakenByEditor: isEditorOpen,
    isFullscreen: fullscreen.isFullscreen,
  };
  const canChooseTracks = useAppSelector(selectCanChooseTracks);
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
  const cuesToPrefetch = useAppSelector((state) =>
    selectCuesToPrefetch(state, subtitles.cues),
  );
  useLookupPrefetch(
    languages.target,
    library ? [] : cuesToPrefetch.map((cue) => stripMarkup(cue.text)),
    wordLookupsIn,
  );
  const isTranslationOnScreen =
    subtitles.translationCues.length > 0 &&
    ((panels.subtitleDisplay !== "target" && !panels.areSubtitlesHidden) ||
      (panels.cues && !isEditorOpen));
  /** The cue of a word's passage, or the cue shown now for the current one; null for a word of a book. */
  const cueOf = (source: LookupSource | null) =>
    source === null ? shownCue : source.kind === "cue" ? source.cue : null;
  const sentence: SentenceRowSource = {
    factsOf: (source) => {
      const cue = cueOf(source);
      const translationCue =
        cue && !isTranslationOnScreen
          ? findTranslationOf(cue, subtitles.translationCues)
          : null;
      return {
        hasAudio: cue !== null,
        translation: translationCue ? stripMarkup(translationCue.text) : null,
      };
    },
    translationLanguage: settings.translation_language,
    play: (source) => {
      const cue = cueOf(source);
      if (cue === null) return;
      dispatch(actions.seekRequested(cue.start_ms / 1000));
      dispatch(actions.playRequested());
    },
    playLabel: "Replay the cue (R)",
  };
  const lookup = useSubtitleLookup(
    languages,
    { draftFor, savesAtOnce: true },
    sentence,
    library && {
      ...library,
      projectId,
      mediaFileId,
      wordlessSource: shownCue && { kind: "cue", cue: shownCue },
    },
  );
  const playerCallbacks: PlayerCallbacks = {
    onTogglePlay: () => dispatch(actions.playToggleRequested()),
    onSeek: (ms) => dispatch(actions.seekRequested(ms / 1000)),
    onSkip: (direction) => dispatch(actions.cueSkipRequested(direction)),
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
  useKeyBindings((root, press) => selectMediaKeyBinding(root.app, press), {
    toggleFullscreen: fullscreen.toggle,
    toggleSentenceTranslation: lookup.toggleSentenceTranslation,
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
          projectName: isEditing ? "Item details" : settings.name,
          source,
        }}
        headerContent={
          isEditing && (
            <LibraryEditingBar kind="subtitles" onOpenDetails={openDetails} />
          )
        }
        stage={<MediaPlayer projectId={projectId} />}
        isPlaying={isPlaying}
        controls={
          <ConnectedPlayerControls
            tracks={tracks}
            panels={shownPanels}
            callbacks={playerCallbacks}
          />
        }
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
        markedWordTitle={markedWordTitle}
        libraryWords={subtitles.libraryWords}
        playerCallbacks={playerCallbacks}
        onBack={isEditing ? openDetails : () => dispatch(actions.closeMedia())}
        onOpenSource={() => dispatch(actions.sourceMediaOpened())}
        activeWord={lookup.activeWord}
        cursor={lookup.cursor}
        wordGestures={lookup.wordGestures}
        onCueStep={cueSteps.step}
        onLookup={lookup.openSearch}
        onAddFlashcard={
          isEditing ? undefined : () => lookup.startWordlessFlashcard("save")
        }
        lookup={
          lookup.popup && (
            <AnchoredPopup {...lookup.popup.anchored}>
              <DictionaryPopup {...lookup.popup.props} />
            </AnchoredPopup>
          )
        }
        sidePanel={
          isEditorOpen ? (
            <MediaFlashcardEditor
              mediaFile={mediaFile}
              screenshotSource={screenshotSource}
              languages={languages}
            />
          ) : panels.cues ? (
            <SubtitlesSidePanel
              subtitles={subtitles}
              tracks={library ? null : tracks}
              languages={languages}
              shownCue={shownCue}
              flashcardCueIndexes={flashcards.cueIndexes}
              flashcardWordRanges={wordRanges}
              markedTitle={markedWordTitle}
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
