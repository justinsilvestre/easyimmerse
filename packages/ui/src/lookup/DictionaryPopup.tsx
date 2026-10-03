import { BookOpen, Plus, Search, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { languageName } from "../projects/languages.ts";
import type { LookupState } from "./lookupState.ts";
import { TermEntryCard } from "./TermEntryCard.tsx";

/**
 * The dictionary pop-up. In `hover` mode it shows the word under the pointer; in `search` mode it opens with a field to type a word into.
 * Clicking a word inside the pop-up starts a flashcard for that word, as it does in the subtitles.
 */
export function DictionaryPopup({
  state,
  mode,
  onSearch,
  onCreateFlashcard,
  onClose,
  onSetUpDictionary,
}: {
  state: LookupState | null;
  mode: "hover" | "search";
  onSearch: (term: string) => void;
  onCreateFlashcard: (term: string, entryIndex: number | null) => void;
  onClose: () => void;
  onSetUpDictionary: () => void;
}) {
  return (
    <section
      aria-label="Dictionary"
      className="flex max-h-[24rem] w-[min(22rem,calc(100vw-1rem))] flex-col rounded-lg border border-line bg-surface text-fg shadow-xl"
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
            onClick={() => onCreateFlashcard(state.term, null)}
          >
            <Plus className="size-3" aria-hidden />
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
          onCreateFlashcard={onCreateFlashcard}
          onSetUpDictionary={onSetUpDictionary}
        />
      </div>
    </section>
  );
}

function termOf(state: LookupState | null): string {
  return state && state.kind !== "noDictionary" ? state.term : "";
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
  onCreateFlashcard,
  onSetUpDictionary,
}: {
  state: LookupState | null;
  onCreateFlashcard: (term: string, entryIndex: number | null) => void;
  onSetUpDictionary: () => void;
}) {
  if (!state) return <Hint>Type a word and press Enter.</Hint>;
  switch (state.kind) {
    case "loading":
      return <Hint>Looking up {state.term}…</Hint>;
    case "notFound":
      return <Hint>No entry for “{state.term}”.</Hint>;
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
      return state.entries.map((entry, index) => (
        <TermEntryCard
          // One dictionary can hold several entries for the same term, and the list never reorders within a lookup.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          key={index}
          entry={entry}
          onWordClick={(word) => onCreateFlashcard(word, null)}
          onCreateFlashcard={() => onCreateFlashcard(state.term, index)}
        />
      ));
  }
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="py-3 text-center text-sm text-fg-muted">{children}</p>;
}
