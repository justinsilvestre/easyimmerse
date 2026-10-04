import type { Cue } from "@easyimmerse/types";
import type { WaveformSegment } from "./Waveform.tsx";

/** Turns cues into waveform segments, marking the cues that have a flashcard. */
export function segmentsFromCues(
  cues: readonly Cue[],
  flashcardCueIndexes: readonly number[],
): WaveformSegment[] {
  return cues.map((cue) => ({
    id: String(cue.index),
    startMs: cue.start_ms,
    endMs: cue.end_ms,
    label: cue.text,
    kind: flashcardCueIndexes.includes(cue.index) ? "flashcard" : "cue",
  }));
}
