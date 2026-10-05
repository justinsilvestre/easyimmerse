import type { Flashcard } from "@easyimmerse/types";
import type { FlashcardSegment } from "../components/waveform/flashcardSegment.ts";

/** The waveform segments of the flashcards that have an audio clip. A card without a screenshot marks the clip's start. */
export function flashcardSegmentsOf(
  flashcards: readonly Pick<Flashcard, "id" | "content">[],
): FlashcardSegment[] {
  return flashcards.flatMap(({ id, content }) =>
    content.audio_context === null
      ? []
      : [
          {
            id,
            startMs: content.audio_context.start_ms,
            endMs: content.audio_context.end_ms,
            screenshotMs:
              content.screenshot?.at_ms ?? content.audio_context.start_ms,
          },
        ],
  );
}
