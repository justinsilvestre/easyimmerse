import {
  useListDictionariesQuery,
  useLookupTextQuery,
} from "@easyimmerse/backend";
import type { LibraryEntry, LookupResult } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { coversLanguage } from "../../components/wordLookup/dictionaryLanguages.ts";
import { lookupQueryOf } from "../../components/wordLookup/lookupQueryOf.ts";
import { languageName } from "../../lib/formatting/languages.ts";
import { libraryEntryOf } from "./libraryEntryOf.ts";

/**
 * What the library manager's own dictionaries give for a word, each result with a "Use this entry" button
 * that hands its headword, reading and definitions to `onUse`.
 */
export function DictionaryResults({
  term,
  languages,
  onUse,
}: {
  term: string;
  languages: { target: string; translation: string };
  onUse: (entry: LibraryEntry) => void;
}) {
  const dictionaries = useListDictionariesQuery().data?.dictionaries;
  const isCovered =
    dictionaries?.some((d) => coversLanguage(d, languages.target)) ?? false;
  const lookup = useLookupTextQuery(
    lookupQueryOf({ text: term }, languages.target),
    {
      skip: !isCovered,
    },
  );
  if (dictionaries && !isCovered)
    return (
      <p className="text-sm text-fg-muted">
        {`None of your dictionaries is for ${languageName(languages.target)}, so you can only write an entry yourself.`}
      </p>
    );
  if (lookup.isError)
    return (
      <p role="alert" className="text-sm text-danger-fg">
        Could not look the word up in your dictionaries.
      </p>
    );
  const results = lookup.currentData?.results;
  if (!results) return <p className="text-sm text-fg-muted">Looking up…</p>;
  if (results.length === 0)
    return (
      <p className="text-sm text-fg-muted">
        Your dictionaries have no entry for it.
      </p>
    );
  const context = { languages, dictionaries: dictionaries ?? [] };
  return (
    <ul aria-label="Dictionary results" className="flex flex-col gap-2">
      {results.map((result, index) => {
        const entry = libraryEntryOf(results, index, context);
        return (
          entry && (
            <li
              key={resultKey(result)}
              className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">
                  {entry.term}
                  {entry.reading && (
                    <span className="font-normal text-fg-muted">{` ${entry.reading}`}</span>
                  )}
                </span>
                <span className="line-clamp-3 whitespace-pre-line text-fg-muted">
                  {entry.l1_definition || entry.l2_definition}
                </span>
              </span>
              <Button size="sm" onClick={() => onUse(entry)}>
                Use this entry
              </Button>
            </li>
          )
        );
      })}
    </ul>
  );
}

/** A key for a result among others, which differ in their matched text, headword, reading or dictionaries. */
function resultKey({ matchedText, term, reading, definitions }: LookupResult) {
  const dictionaries = definitions.map(({ dictionaryId }) => dictionaryId);
  return [matchedText, term, reading, ...dictionaries].join("|");
}
