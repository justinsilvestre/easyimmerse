import type { DictionaryStylesheet } from "@easyimmerse/types";
import { BookOpen, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";
import { languageName } from "../projects/languages.ts";
import type { ResolveMediaUrl } from "./definition/definitionContext.ts";
import { KanjiCard } from "./KanjiCard.tsx";
import { LookupResultCard } from "./LookupResultCard.tsx";
import type { LookupState } from "./lookupState.ts";
import { type PopupSize, popupHeight, popupWidth } from "./popupSize.ts";
import { type PopupWordActions, PopupWordContext } from "./popupWordContext.ts";
import { DictionaryStylesheets } from "./stylesheet/DictionaryStylesheets.tsx";
import { usePopupDismissal } from "./usePopupDismissal.ts";

/**
 * The dictionary pop-up. In `word` mode it opens on the word chosen in the text, which fills its field; in `search` mode the field opens empty, with focus.
 * Either way the field can be edited and submitted to look something else up.
 * Double-clicking a word inside the pop-up, or following a link to another headword, looks it up in turn;
 * a single click on a word does nothing, so that it reaches the entry's own clickable elements.
 * A flashcard comes from every result with the header button (`entryIndex` null) or from one result with its own button,
 * and, through `wordActions`, from a word inside the pop-up that is held on a touch screen.
 * When no dictionary has an entry for the word, the header button still makes a flashcard, with the word and its sentence only.
 * While such a flashcard waits for its word's lookup, `pendingFlashcard` names the word.
 * A thin bar along its bottom edge asks, through `onToggleSize`, to switch the pop-up between its two `size`s, to show more or less of the entries.
 * Escape, or pressing outside the pop-up and not on a word marked as a lookup trigger, closes it;
 * while it is expanded, Escape asks through `onToggleSize` to make it compact again instead.
 * Images in definitions are found through `resolveMediaUrl`.
 */
export function DictionaryPopup({
  id,
  state,
  mode,
  size = "compact",
  resolveMediaUrl,
  onSearch,
  onCreateFlashcard,
  onToggleSize,
  wordActions = null,
  pendingFlashcard = null,
  onClose,
  onSetUpDictionary,
}: {
  /** Lets the word the pop-up shows name it as the element it controls. */
  id?: string;
  state: LookupState | null;
  mode: "word" | "search";
  size?: PopupSize;
  resolveMediaUrl: ResolveMediaUrl;
  onSearch: (term: string) => void;
  onCreateFlashcard: (entryIndex: number | null) => void;
  onToggleSize?: () => void;
  wordActions?: PopupWordActions | null;
  pendingFlashcard?: string | null;
  onClose: () => void;
  onSetUpDictionary: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const isExpanded = size === "expanded";
  usePopupDismissal(ref, onClose, isExpanded ? onToggleSize : undefined);
  return (
    <section
      ref={ref}
      id={id}
      // Not modal: the rest of the page stays usable, and words there move it to themselves.
      role="dialog"
      aria-label="Dictionary"
      data-size={size}
      style={{ width: popupWidth(size), ...popupHeight(size) }}
      className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface text-fg shadow-xl transition-[width] duration-150 ease-out motion-reduce:transition-none"
    >
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <TermField
          // A new term refills the field; typing in between keeps what was typed.
          key={termOf(state)}
          term={termOf(state)}
          autoFocus={mode === "search"}
          onSearch={onSearch}
        />
        {(state?.kind === "found" || state?.kind === "notFound") && (
          <IconButton
            label="New flashcard"
            onClick={() => onCreateFlashcard(null)}
          >
            <NewFlashcardIcon className="size-4" />
          </IconButton>
        )}
        <IconButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {pendingFlashcard !== null && (
          <p role="status" className="pb-2 text-sm text-fg-muted">
            Making a flashcard for “{pendingFlashcard}”…
          </p>
        )}
        <PopupWordContext value={wordActions}>
          <Body
            state={state}
            resolveMediaUrl={resolveMediaUrl}
            onSearch={onSearch}
            onCreateFlashcard={onCreateFlashcard}
            onSetUpDictionary={onSetUpDictionary}
          />
        </PopupWordContext>
      </div>
      <SizeToggle isExpanded={isExpanded} onToggle={onToggleSize} />
    </section>
  );
}

/** The thin bar along the pop-up's bottom edge that shows more or less of the entries. */
function SizeToggle({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle?: () => void;
}) {
  const label = isExpanded ? "Show less" : "Show more";
  const Chevron = isExpanded ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isExpanded}
      title={label}
      onClick={onToggle}
      className="flex h-4 w-full shrink-0 items-center justify-center border-t border-line text-fg-faint hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <Chevron className="size-3" aria-hidden />
    </button>
  );
}

/**
 * The word the pop-up shows: the beginning of the term that its best result matched, once found,
 * since a run of Japanese is looked up from a character to the run's end.
 */
function termOf(state: LookupState | null): string {
  const term = state?.term ?? "";
  const matched =
    state?.kind === "found" ? state.results[0]?.matchedText : undefined;
  return matched !== undefined && term.startsWith(matched) ? matched : term;
}

/**
 * The field holding the word shown, which can be edited and submitted to look up something else.
 * Its magnifying glass submits what was typed once it differs from the word shown;
 * until then it selects the word, to show that another can be typed over it.
 */
function TermField({
  term,
  autoFocus,
  onSearch,
}: {
  term: string;
  /** Whether the pop-up opened for the sake of this field, which then takes focus right away. */
  autoFocus: boolean;
  onSearch: (term: string) => void;
}) {
  const [typed, setTyped] = useState(term);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNewTerm = typed.trim() !== term;
  return (
    <form
      className="flex flex-1 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(typed);
      }}
    >
      {isNewTerm ? (
        <IconButton label="Look up" type="submit" className="shrink-0">
          <Search className="size-4" />
        </IconButton>
      ) : (
        <IconButton
          label="Edit the word"
          className="shrink-0"
          onClick={() => inputRef.current?.select()}
        >
          <Search className="size-4" />
        </IconButton>
      )}
      <input
        ref={inputRef}
        // biome-ignore lint/a11y/noAutofocus: see the prop's description
        autoFocus={autoFocus}
        aria-label="Word to look up"
        placeholder="Type a word"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        className="w-full bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-fg-faint"
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
      return (
        <Hint>
          No entry for “{state.term}”.{" "}
          <button
            type="button"
            onClick={onSetUpDictionary}
            className="text-accent-fg underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-accent"
          >
            Check your dictionaries
          </button>
        </Hint>
      );
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
              onWordLookup={onSearch}
              onLookup={onSearch}
              onCreateFlashcard={() => onCreateFlashcard(index)}
            />
          ))}
          {state.kanji?.map((kanji) => (
            <KanjiCard
              key={`${kanji.dictionaryId}-${kanji.entry.character}`}
              result={kanji}
              onWordLookup={onSearch}
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
