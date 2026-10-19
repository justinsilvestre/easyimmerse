import {
  type LookupSource,
  type ReaderLocation,
  selectShownReaderViewMode,
} from "@easyimmerse/state";
import type { Document, TextSpan } from "@easyimmerse/types";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import type { LookupPlace } from "../lookup/lookupPlace.ts";
import type { ReaderSentenceRowSource } from "../lookup/useReaderLookup.ts";
import { textOfSpans } from "./alignment/textSpans.ts";
import type { ReaderAudio } from "./readerAudio.ts";
import type { useBookTranslation } from "./useBookTranslation.tsx";

const noSpans: readonly TextSpan[] = [];

/**
 * What the dictionary pop-up's sentence row knows about the book's sentences: a sentence has audio where the book's aligned audio
 * speaks it, and a translation where the book is aligned with its translation and shown alone, since the bilingual views show
 * every translation already. The current sentence is the one being spoken.
 */
export function useReaderSentenceRow(
  text: Document,
  bilingual: Pick<
    ReturnType<typeof useBookTranslation>,
    "translation" | "linkedPassageAt"
  >,
  audio: ReaderAudio | undefined,
): ReaderSentenceRowSource {
  const viewMode = useAppSelector(selectShownReaderViewMode);
  const spoken = audio?.spokenSpan ?? null;
  const spokenLocation: ReaderLocation | null = spoken && {
    chapterIndex: spoken.chapter_index,
    paragraphIndex: spoken.paragraph_index,
    offset: spoken.start,
  };
  const locationOf = (source: LookupSource | null) =>
    source === null
      ? spokenLocation
      : source.kind === "text"
        ? source.location
        : null;
  const translationAt = (location: ReaderLocation | null) =>
    location !== null && viewMode === "target"
      ? (bilingual.linkedPassageAt(location)?.translation ?? null)
      : null;
  return {
    factsOf: (source) => {
      const location = locationOf(source);
      return {
        hasAudio: location !== null && (audio?.hasSegmentAt(location) ?? false),
        translation: translationAt(location),
      };
    },
    translationLanguage: bilingual.translation.language,
    play: (source) => {
      const location = locationOf(source);
      if (location !== null) audio?.playAt(location);
    },
    playLabel: "Play the sentence (R)",
    translatedSpansOf: (source) => {
      const location = locationOf(source);
      return (
        (location && bilingual.linkedPassageAt(location)?.spans) ?? noSpans
      );
    },
    spokenPlace: spoken &&
      spokenLocation && {
        source: {
          kind: "text",
          sentence: textOfSpans(text, [spoken]),
          location: spokenLocation,
          isUnspaced: false,
        },
        start: null,
      },
  } satisfies ReaderSentenceRowSource & { spokenPlace: LookupPlace | null };
}
