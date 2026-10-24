import { distributeFurigana } from "./distributeFurigana.ts";

/** Shows a term with its reading: as furigana over the kanji when the term has any, and beside the term otherwise. */
export function ResultHeadword({
  term,
  reading,
}: {
  term: string;
  reading: string | null;
}) {
  const parts = distributeFurigana(term, reading);
  const showsReadingBeside =
    !!reading && reading !== term && parts.every((part) => part.ruby === null);
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-xl leading-tight font-semibold">
        {parts.map((part, index) =>
          part.ruby ? (
            // The parts of a headword never reorder.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <ruby key={index}>
              {part.text}
              <rt className="text-[0.5em] font-normal text-fg-muted">
                {part.ruby}
              </rt>
            </ruby>
          ) : (
            part.text
          ),
        )}
      </span>
      {showsReadingBeside && (
        <span className="text-sm text-fg-muted">{reading}</span>
      )}
    </span>
  );
}
