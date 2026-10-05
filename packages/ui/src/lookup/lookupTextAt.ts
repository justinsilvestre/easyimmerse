/** What a lookup sends about a word clicked in a sentence. */
export type LookupText = {
  /** The text from the clicked word onwards. */
  text: string;
  /** The whole sentence, such as a subtitle cue. */
  context: string;
  /** The position of the clicked word in `context`, counted in characters rather than UTF-16 code units. */
  offset: number;
};

/** Describes the lookup of the word that starts at a UTF-16 `index` of `context`. */
export function lookupTextAt(context: string, index: number): LookupText {
  return {
    text: context.slice(index),
    context,
    offset: [...context.slice(0, index)].length,
  };
}
