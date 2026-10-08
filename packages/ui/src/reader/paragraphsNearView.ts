/**
 * The paragraphs of a chapter whose words to look up ahead of the reader, most urgent first:
 * from `firstInView` on, enough text for the screen in view and the next one, then, going back, enough for the screen before.
 * `screenCharacters` is about how much text one screen shows.
 */
export function paragraphsNearView(
  paragraphs: readonly string[],
  firstInView: number,
  screenCharacters: number,
): string[] {
  const ahead = takeUntil(paragraphs.slice(firstInView), 2 * screenCharacters);
  const behind = takeUntil(
    paragraphs.slice(0, firstInView).reverse(),
    screenCharacters,
  );
  return [...ahead, ...behind];
}

/** The paragraphs from the first, up to and including the one that brings their length to `characters`. */
function takeUntil(paragraphs: readonly string[], characters: number) {
  const taken: string[] = [];
  let length = 0;
  for (const paragraph of paragraphs) {
    if (length >= characters) break;
    taken.push(paragraph);
    length += paragraph.length;
  }
  return taken;
}
