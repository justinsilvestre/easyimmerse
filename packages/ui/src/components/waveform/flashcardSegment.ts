/**
 * The span of media a flashcard covers, with the moment its screenshot is taken from.
 * Stands in for the flashcard type the server will define.
 */
export type FlashcardSegment = {
  id: string;
  startMs: number;
  endMs: number;
  screenshotMs: number;
};
