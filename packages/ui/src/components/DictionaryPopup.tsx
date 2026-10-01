import { actions, type LookupState, selectLookup } from "@easyimmerse/state";
import type { DictionaryLookupResult, TermEntry } from "@easyimmerse/types";
import { useRef } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { useDocumentListener } from "../hooks/useDocumentListener.ts";
import {
  DictionaryPopupBody,
  type LookupStatus,
} from "./DictionaryPopupBody.tsx";
import { DictionaryPopupHeader } from "./DictionaryPopupHeader.tsx";

type DictionaryPopupProps = {
  /** The entries for the looked-up term, grouped by the dictionary they come from. */
  results: readonly DictionaryLookupResult[];
  status: LookupStatus;
  /** Whether the project has any dictionary to look terms up in. */
  hasDictionaries: boolean;
  /** Receives the entry the user picked, or null when the user picked none in particular. */
  onCreateFlashcard: (entry: TermEntry | null) => void;
  onSetUpDictionary: () => void;
};

/**
 * Shows the dictionary entries for the term in the lookup, in a compact panel that leaves the rest of the page usable.
 * Escape, the close button, or a mouse press outside the panel closes the lookup.
 * A press on a word button is left to the word, which opens the lookup anew or makes a flashcard.
 */
export function DictionaryPopup(props: DictionaryPopupProps) {
  const lookup = useAppSelector(selectLookup);
  if (lookup.kind === "closed") return null;
  return <OpenDictionaryPopup lookup={lookup} {...props} />;
}

function OpenDictionaryPopup({
  lookup,
  results,
  status,
  hasDictionaries,
  onCreateFlashcard,
  onSetUpDictionary,
}: DictionaryPopupProps & {
  lookup: Extract<LookupState, { kind: "open" }>;
}) {
  const dispatch = useAppDispatch();
  const panel = useRef<HTMLDivElement>(null);
  const close = () => dispatch(actions.lookupClosed());
  useDocumentListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  useDocumentListener("mousedown", (event) => {
    if (!isPressOnWord(event) && !panel.current?.contains(event.target as Node))
      close();
  });
  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Dictionary"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[60vh] flex-col rounded-t-xl border border-gray-200 bg-white text-gray-900 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96 sm:rounded-xl"
    >
      <DictionaryPopupHeader
        lookup={lookup}
        onCreateFlashcard={() => onCreateFlashcard(null)}
        onClose={close}
      />
      <div className="overflow-y-auto px-4 pb-4">
        {lookup.context !== null && (
          <p className="mb-3 text-sm text-gray-500 italic">{lookup.context}</p>
        )}
        <DictionaryPopupBody
          term={lookup.term}
          preferredReading={lookup.preferredReading}
          results={results}
          status={status}
          hasDictionaries={hasDictionaries}
          onCreateFlashcard={onCreateFlashcard}
          onSetUpDictionary={onSetUpDictionary}
        />
      </div>
    </div>
  );
}

function isPressOnWord(event: MouseEvent): boolean {
  return (
    event.target instanceof Element &&
    event.target.closest("[data-word]") !== null
  );
}
