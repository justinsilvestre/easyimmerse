import { Search } from "lucide-react";
import { IconButton } from "../components/IconButton.tsx";
import { lookupTriggerAttribute } from "../components/lookupTrigger.ts";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";

/** The buttons in the corner of the subtitles that search the dictionary and save a flashcard from the subtitle shown. */
export function SubtitleLookupButtons({
  onLookup,
  onAddFlashcard,
}: {
  onLookup: () => void;
  onAddFlashcard: () => void;
}) {
  return (
    <span className="flex items-center gap-1 rounded-md bg-black/50">
      <IconButton
        label="Look up a word (L)"
        {...{ [lookupTriggerAttribute]: "" }}
        onClick={onLookup}
      >
        <Search className="size-4" />
      </IconButton>
      <IconButton
        label="New flashcard from this subtitle (C)"
        onClick={onAddFlashcard}
      >
        <NewFlashcardIcon className="size-4" />
      </IconButton>
    </span>
  );
}
