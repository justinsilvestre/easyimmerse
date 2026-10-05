import type { DictionaryStylesheet } from "@easyimmerse/types";
import { BookOpen, Search, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";
import { languageName } from "../projects/languages.ts";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import { KanjiCard } from "./KanjiCard.tsx";
import { LookupResultCard } from "./LookupResultCard.tsx";
import type { LookupState } from "./lookupState.ts";
import { DictionaryStylesheets } from "./stylesheet/DictionaryStylesheets.tsx";
import { usePopupDismissal } from "./usePopupDismissal.ts";

/**
 * The dictionary pop-up. In `hover` mode it shows the word chosen in the text; in `search` mode it opens with a field to type a word into.
 * Clicking a word inside the pop-up, or following a link to another headword, looks it up in turn.
 * A flashcard comes from every result with the header button (`entryIndex` null) or from one result with its own button.
 * Escape, or pressing outside the pop-up and not on a word marked as a lookup trigger, closes it.
 * Images in definitions are found through `resolveMediaUrl`.
 */
export function DictionaryPopup({
  state,
  mode,
  resolveMediaUrl,
  onSearch,
  onCreateFlashcard,
  onClose,
  onSetUpDictionary,
}: {
  state: LookupState | null;
  mode: "hover" | "search";
  resolveMediaUrl: ResolveMediaUrl;
  onSearch: (term: string) => void;
  onCreateFlashcard: (entryIndex: number | null) => void;
  onClose: () => void;
  onSetUpDictionary: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  usePopupDismissal(ref, onClose);
  return (
    <section
      ref={ref}
      aria-label="Dictionary"
      className="flex max-h-[min(24rem,100%)] w-[min(26rem,calc(100vw-1rem))] flex-col rounded-lg border border-line bg-surface text-fg shadow-xl"
    >
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        {mode === "search" ? (
          <SearchField onSearch={onSearch} />
        ) : (
          <span className="flex-1 truncate font-semibold">{termOf(state)}</span>
        )}
        {state && state.kind === "found" && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onCreateFlashcard(null)}
          >
            <NewFlashcardIcon className="size-3.5" />
            Flashcard
          </Button>
        )}
        <IconButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <Body
          state={state}
          resolveMediaUrl={resolveMediaUrl}
          onSearch={onSearch}
          onCreateFlashcard={onCreateFlashcard}
          onSetUpDictionary={onSetUpDictionary}
        />
      </div>
    </section>
  );
}

function termOf(state: LookupState | null): string {
  if (state?.kind === "noDictionary") return state.term ?? "Dictionary";
  return state?.term ?? "";
}

function SearchField({ onSearch }: { onSearch: (term: string) => void }) {
  const [term, setTerm] = useState("");
  return (
    <form
      className="flex flex-1 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(term);
      }}
    >
      <Search className="size-4 shrink-0 text-fg-muted" aria-hidden />
      <input
        // The pop-up opens for the sake of this field, so it takes focus right away.
        // biome-ignore lint/a11y/noAutofocus: see above
        autoFocus
        aria-label="Word to look up"
        placeholder="Type a word"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        className="w-full bg-transparent text-sm outline-none placeholder:text-fg-faint"
      />
    </form>
  );
}

function Body({
  state,
  resolveMediaUrl,
  onSearch,
  onCreateFlashcard,
  onSetUpDictionary,
}: {
  state: LookupState | null;
  resolveMediaUrl: ResolveMediaUrl;
  onSearch: (term: string) => void;
  onCreateFlashcard: (entryIndex: number | null) => void;
  onSetUpDictionary: () => void;
}) {
  if (!state) return <Hint>Type a word and press Enter.</Hint>;
  switch (state.kind) {
    case "loading":
      return <Hint>Looking up {state.term}…</Hint>;
    case "notFound":
      return <Hint>No entry for “{state.term}”.</Hint>;
    case "failed":
      return (
        <Hint>The dictionaries could not be searched for “{state.term}”.</Hint>
      );
    case "noDictionary":
      return (
        <div className="flex flex-col items-center gap-2 py-4 text-center text-sm">
          <BookOpen className="size-6 text-fg-faint" aria-hidden />
          <p>No dictionary is set up for {languageName(state.language)} yet.</p>
          <Button variant="primary" size="sm" onClick={onSetUpDictionary}>
            Add a dictionary
          </Button>
        </div>
      );
    case "found":
      return (
        <>
          <DictionaryStylesheets
            stylesheets={state.stylesheets ?? noStylesheets}
            resolveMediaUrl={resolveMediaUrl}
          />
          {state.results.map((result, index) => (
            <LookupResultCard
              // Results never reorder within a lookup, and two results can share a term.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              key={index}
              result={result}
              resolveMediaUrl={resolveMediaUrl}
              onWordClick={onSearch}
              onLookup={onSearch}
              onCreateFlashcard={() => onCreateFlashcard(index)}
            />
          ))}
          {state.kanji?.map((kanji) => (
            <KanjiCard
              key={`${kanji.dictionaryId}-${kanji.entry.character}`}
              result={kanji}
              onWordClick={onSearch}
            />
          ))}
        </>
      );
  }
}

const noStylesheets: readonly DictionaryStylesheet[] = [];

function Hint({ children }: { children: ReactNode }) {
  return <p className="py-3 text-center text-sm text-fg-muted">{children}</p>;
}
