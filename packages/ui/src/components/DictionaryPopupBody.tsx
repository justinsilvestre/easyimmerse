import type { DictionaryLookupResult, TermEntry } from "@easyimmerse/types";
import { Button } from "./Button.tsx";
import { LookupEntry } from "./LookupEntry.tsx";

export type LookupStatus = "idle" | "loading" | "error";

/** Shows the entries grouped by dictionary, or the reason there are none to show. */
export function DictionaryPopupBody({
  term,
  preferredReading,
  results,
  status,
  hasDictionaries,
  onCreateFlashcard,
  onSetUpDictionary,
}: {
  term: string;
  /** The reading whose entries come first in each dictionary, when one is preferred. */
  preferredReading: string | null;
  results: readonly DictionaryLookupResult[];
  status: LookupStatus;
  hasDictionaries: boolean;
  onCreateFlashcard: (entry: TermEntry) => void;
  onSetUpDictionary: () => void;
}) {
  if (!hasDictionaries)
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p>No dictionary is set up for this project.</p>
        <Button onClick={onSetUpDictionary}>Set up a dictionary</Button>
      </div>
    );
  if (term === "")
    return <p className="text-sm text-gray-500">Type a word to look it up.</p>;
  if (status === "loading") return <LookupSkeleton term={term} />;
  if (status === "error")
    return (
      <p role="alert" className="text-sm text-red-700">
        The lookup failed. Try again in a moment.
      </p>
    );
  const found = results.filter((result) => result.entries.length > 0);
  if (found.length === 0)
    return <p className="text-sm text-gray-500">No entries for {term}</p>;
  return found.map(({ dictionary, entries }) => (
    <section key={dictionary.id} className="mt-2 first:mt-0">
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {dictionary.title}
      </h3>
      <ul className="flex flex-col gap-1">
        {putReadingFirst(entries, preferredReading).map((entry, index) => (
          <LookupEntry
            // biome-ignore lint/suspicious/noArrayIndexKey: Entries of one lookup never change, and two may share a term and reading.
            key={`${entry.term}-${entry.reading}-${index}`}
            entry={entry}
            dictionaryId={dictionary.id}
            onClick={() => onCreateFlashcard(entry)}
          />
        ))}
      </ul>
    </section>
  ));
}

function putReadingFirst(
  entries: readonly TermEntry[],
  reading: string | null,
): TermEntry[] {
  if (reading === null) return [...entries];
  const isPreferred = (entry: TermEntry) => entry.reading === reading;
  return [
    ...entries.filter(isPreferred),
    ...entries.filter((entry) => !isPreferred(entry)),
  ];
}

function LookupSkeleton({ term }: { term: string }) {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-busy="true">
      <p role="status" className="sr-only">
        Looking up {term}…
      </p>
      <div className="h-4 w-1/3 rounded bg-gray-200" />
      <div className="h-3 w-5/6 rounded bg-gray-200" />
      <div className="h-3 w-2/3 rounded bg-gray-200" />
    </div>
  );
}
