import { actions } from "@easyimmerse/state";
import type { AudioClip, Cue, MediaFile, Project } from "@easyimmerse/types";
import {
  useMediaDurationMs,
  useWaveformFetch,
} from "../../components/PlayerWaveform.tsx";
import { useWaveformWindows } from "../../components/waveform/useWaveformWindows.ts";
import { FlashcardEditorForm } from "../../flashcards/FlashcardEditor.tsx";
import type { MediaWaveform } from "../../flashcards/FlashcardEditorFields.tsx";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { CuePanel } from "../../media/CuePanel.tsx";
import { SubtitleTrackBar } from "../../media/SubtitleTrackBar.tsx";
import type { useFlashcardEditing } from "./useFlashcardEditing.ts";
import type { Subtitles } from "./useSubtitles.ts";

/** How much audio around the clip the editor's waveform loads, on each side. */
const clipMarginMs = 30_000;

/** The panel beside the stage: the flashcard editor while a flashcard is open, else the subtitles. */
export function MediaSidePanel({
  project,
  mediaFile,
  subtitles,
  showsCues,
  activeCueIndex,
  flashcardCueIndexes,
  activeWord,
  editing,
  onWordHover,
  onWordClick,
}: {
  project: Project;
  mediaFile: MediaFile;
  subtitles: Subtitles;
  showsCues: boolean;
  activeCueIndex: number | null;
  flashcardCueIndexes: readonly number[];
  activeWord?: string;
  editing: ReturnType<typeof useFlashcardEditing>;
  onWordHover: (word: string, cue: Cue) => void;
  onWordClick: (word: string, cue: Cue) => void;
}) {
  const dispatch = useAppDispatch();
  if (editing.editing)
    return (
      <EditorPanel project={project} mediaFile={mediaFile} editing={editing} />
    );
  if (!showsCues) return null;
  return (
    <>
      <SubtitleTrackBar
        tracks={{
          audio: [],
          subtitles: subtitles.options,
          audioId: null,
          targetSubtitlesId: subtitles.selection.target,
          translationSubtitlesId: subtitles.selection.translation,
        }}
        onTargetChange={(trackId) => subtitles.choose("target", trackId)}
        onTranslationChange={(trackId) =>
          subtitles.choose("translation", trackId)
        }
        onAddFile={() =>
          dispatch(
            actions.subtitleFilePickRequested(
              subtitles.selection.target === null ? "target" : "translation",
            ),
          )
        }
      />
      <CuePanel
        cues={subtitles.cues}
        translationCues={subtitles.translationCues}
        activeCueIndex={activeCueIndex}
        flashcardCueIndexes={flashcardCueIndexes}
        activeWord={activeWord}
        onSeek={(ms) => dispatch(actions.seekRequested(ms / 1000))}
        onWordHover={onWordHover}
        onWordClick={onWordClick}
        onAddSubtitlesFile={() =>
          dispatch(actions.subtitleFilePickRequested("target"))
        }
        onGenerateSubtitles={() =>
          dispatch(
            actions.notificationRequested(
              "Generating subtitles is not available yet.",
            ),
          )
        }
      />
    </>
  );
}

function EditorPanel({
  project,
  mediaFile,
  editing,
}: {
  project: Project;
  mediaFile: MediaFile;
  editing: ReturnType<typeof useFlashcardEditing>;
}) {
  const open = editing.editing;
  const waveform = useClipWaveform(
    project.id,
    mediaFile,
    open?.state.content.audio_context ?? null,
  );
  if (open === null) return null;
  return (
    <div className="flex min-h-0 flex-1 p-2">
      <FlashcardEditorForm
        state={open.state}
        dispatch={editing.dispatch}
        languages={{
          target: project.settings.target_language,
          translation: project.settings.translation_language,
        }}
        waveform={waveform}
        onSave={editing.save}
        onDelete={editing.remove}
        onClose={editing.close}
      />
    </div>
  );
}

/** The waveform windows around the clip, loaded from the server; null for a file without a waveform. */
function useClipWaveform(
  projectId: string,
  mediaFile: MediaFile,
  clip: AudioClip | null,
): MediaWaveform | null {
  const durationMs = useMediaDurationMs(projectId, mediaFile);
  const fetchWindow = useWaveformFetch(projectId, mediaFile);
  const focusMs = clip?.start_ms ?? 0;
  const windows = useWaveformWindows(fetchWindow, {
    viewStartMs: Math.max(0, focusMs - clipMarginMs),
    viewEndMs: Math.min(durationMs, (clip?.end_ms ?? 0) + clipMarginMs),
    focusMs,
    durationMs: clip === null ? 0 : durationMs,
  });
  if (mediaFile.source.kind !== "path" || durationMs === 0) return null;
  return { windows, durationMs };
}
