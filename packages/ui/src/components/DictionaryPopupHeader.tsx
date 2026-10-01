import type { LookupState } from "@easyimmerse/state";
import { Button } from "./Button.tsx";
import { DictionaryPopupTermInput } from "./DictionaryPopupTermInput.tsx";

export function DictionaryPopupHeader({
  lookup,
  onCreateFlashcard,
  onClose,
}: {
  lookup: Extract<LookupState, { kind: "open" }>;
  onCreateFlashcard: () => void;
  onClose: () => void;
}) {
  return (
    <header className="flex items-center gap-2 px-4 pt-3 pb-2">
      {lookup.typed ? (
        <DictionaryPopupTermInput initialTerm={lookup.term} />
      ) : (
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {lookup.term}
        </h2>
      )}
      <Button
        variant="primary"
        className="shrink-0"
        disabled={lookup.term === ""}
        onClick={onCreateFlashcard}
      >
        Make flashcard
      </Button>
      <button
        type="button"
        aria-label="Close dictionary"
        className="shrink-0 rounded px-2 text-xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        onClick={onClose}
      >
        ×
      </button>
    </header>
  );
}
