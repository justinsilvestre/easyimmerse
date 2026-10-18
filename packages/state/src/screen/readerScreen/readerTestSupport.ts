import type {
  Alignment,
  Document,
  MediaFile,
  TimedSpan,
} from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import type { RootState } from "../../app/createAppStore.ts";
import { stateAfterWithCache } from "../../app/stateAfter.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import { serverCacheWith } from "../../server/serverCacheWith.ts";
import type { ReaderLocation } from "../../storedPlaces/readingLocation.ts";
import type { AnchorRect, ChosenWord } from "../lookup/lookupState.ts";

/** The book b1 of project p1, for tests of the reader. */
export const bookFile: MediaFile = exampleMediaFile("b1", "sample.epub");
/** The audio file a1 the book can be aligned with. */
export const audioFile: MediaFile = exampleMediaFile("a1", "sample.mp3");
/** The text file t1 the book can be paired with as its translation. */
export const translationFile: MediaFile = exampleMediaFile(
  "t1",
  "translation.txt",
);

const translationText: Document = {
  title: "",
  language: "es",
  chapters: [{ title: null, paragraphs: ["El gato duerme."] }],
};

/** The one segment of the book's audio alignment: the first ten characters of the second paragraph, heard from 0.8 to 2 seconds. */
export const spokenSegment: TimedSpan = {
  span: { chapter_index: 0, paragraph_index: 1, start: 0, end: 10 },
  start_ms: 800,
  end_ms: 2000,
};

/** The book's audio alignment with the audio file of the given id. */
export function audioAlignment(audioMediaFileId = audioFile.id): Alignment {
  return {
    id: "audio-alignment",
    media_file_id: bookFile.id,
    provider: null,
    created_at_ms: 0,
    content: {
      kind: "audio",
      audio_media_file_id: audioMediaFileId,
      segments: [spokenSegment],
    },
  };
}

/** The book's translation alignment with the media file of the given id. */
export function translationAlignment(
  translationMediaFileId = translationFile.id,
): Alignment {
  return {
    id: "translation-alignment",
    media_file_id: bookFile.id,
    provider: null,
    created_at_ms: 0,
    content: {
      kind: "translation",
      translation_media_file_id: translationMediaFileId,
      links: [],
    },
  };
}

/**
 * The server cache of project p1 as the reader on b1 sees it: the book, the audio file and the translation file listed,
 * the book's alignments as given, and the translation's text when the book is paired with it.
 */
export function readerCacheWith({
  alignments = [],
  isPaired = false,
}: {
  alignments?: readonly Alignment[];
  isPaired?: boolean;
} = {}): ServerCacheSlice {
  const book = isPaired
    ? { ...bookFile, translation_media_file_id: translationFile.id }
    : bookFile;
  const listed = serverCacheWith(
    "listAlignments",
    { projectId: "p1", mediaFileId: "b1" },
    { alignments: [...alignments] },
    serverCacheWith("listMediaFiles", "p1", {
      media_files: [book, audioFile, translationFile],
    }),
  );
  if (!isPaired) return listed;
  const { name, source } = translationFile;
  return serverCacheWith("openBook", { name, source }, translationText, listed);
}

/** The server cache with the book aligned with both its audio and its translation. */
export const alignedReaderCache = readerCacheWith({
  alignments: [audioAlignment(), translationAlignment()],
  isPaired: true,
});

/** The app with book b1 open in the reader after the given actions, reading the given server cache. */
export function readingWith(
  backend: ServerCacheSlice,
  ...done: AppAction[]
): RootState {
  return {
    app: stateAfterWithCache(
      backend,
      actions.openMediaFileRequested("p1", "b1"),
      ...done,
    ),
    backend,
  };
}

/** A word of the book's text chosen for the dictionary pop-up at the location, drawn in the rectangle. */
export function chosenTextWord(
  location: ReaderLocation,
  rect: AnchorRect | null = null,
): ChosenWord {
  return {
    word: { term: "dog", query: null },
    source: {
      kind: "text",
      sentence: "The dog wants to eat.",
      location,
      isUnspaced: false,
    },
    occurrence: {
      passage: `${location.chapterIndex}:${location.paragraphIndex}`,
      start: location.offset,
    },
    anchor: rect && { rect },
  };
}
