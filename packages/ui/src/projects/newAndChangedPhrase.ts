/** Counts new and changed flashcards in one phrase, such as `3 new and 1 changed flashcards`, leaving out a count of zero. */
export function newAndChangedPhrase(newCount: number, changedCount: number) {
  const noun = newCount + changedCount === 1 ? "flashcard" : "flashcards";
  const parts = [
    ...(newCount > 0 ? [`${newCount} new`] : []),
    ...(changedCount > 0 ? [`${changedCount} changed`] : []),
  ];
  return `${parts.join(" and ")} ${noun}`;
}
