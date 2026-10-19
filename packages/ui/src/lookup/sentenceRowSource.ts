import type { LookupSource } from "@easyimmerse/state";

/** What the pop-up's sentence row knows about a sentence or cue: whether it has audio, and its translation when one exists and is not already on screen. */
export type SentenceFacts = { hasAudio: boolean; translation: string | null };

/**
 * What a screen tells the dictionary pop-up's sentence row, and how it plays a sentence or cue.
 * A null source stands for the current sentence or cue: the one being spoken in a book, or the cue shown now on the media screen.
 */
export type SentenceRowSource = {
  /** The facts about the passage a word was chosen in, or about the current sentence or cue. */
  factsOf: (source: LookupSource | null) => SentenceFacts;
  /** The language of the translations. */
  translationLanguage: string;
  /** Plays the passage a word was chosen in, or the current sentence or cue. */
  play: (source: LookupSource | null) => void;
  /** The play button's label, which names the R key. */
  playLabel: string;
};
