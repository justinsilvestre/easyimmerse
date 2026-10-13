import type { MediaFile } from "@easyimmerse/types";

/** The action creators of the audio a book is aligned with, which the reader plays. */
export const readerAudioActions = {
  /**
   * The reader found the audio file the book is aligned with, a media file of the same project.
   * From then on the screen's player plays that file, as `selectPlayedMediaFile` describes.
   */
  readerAudioOpened: (audioFile: MediaFile) =>
    ({ type: "readerAudioOpened", audioFile }) as const,
};

/** An action of the reader's audio. */
export type ReaderAudioAction = ReturnType<
  (typeof readerAudioActions)[keyof typeof readerAudioActions]
>;
