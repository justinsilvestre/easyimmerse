import type { TermEntry } from "@easyimmerse/types";
import clsx from "clsx";
import { DictionaryStylesheet } from "../glossary/DictionaryStylesheet.tsx";
import { GlossaryItem } from "../glossary/GlossaryItem.tsx";

/**
 * Shows one dictionary entry as a list item that makes a flashcard when clicked.
 * A transparent button covers the whole item, so the definitions can stay a real list for assistive technology.
 * The definitions sit above that button so that no dictionary style can hide their links beneath it,
 * and they let presses through everywhere except on their links and other controls.
 */
export function LookupEntry({
  entry,
  dictionaryId,
  onClick,
}: {
  entry: TermEntry;
  dictionaryId: string;
  onClick: () => void;
}) {
  return (
    <li className="relative rounded-lg px-2 py-1.5 hover:bg-accent-soft">
      <button
        type="button"
        aria-label={`Make flashcard from ${entry.term}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        onClick={onClick}
      />
      <p>
        <span className="font-medium">{entry.term}</span>
        {entry.reading !== null && (
          <span className="ml-2 text-sm text-fg-muted">{entry.reading}</span>
        )}
      </p>
      <div className="pointer-events-none relative z-20 text-sm [--font-size-no-units:14]">
        <DictionaryStylesheet dictionaryId={dictionaryId} />
        <ol
          className={clsx(
            entry.definitions.length > 1 ? "list-decimal pl-5" : "list-none",
          )}
        >
          {entry.definitions.map((definition, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: An entry's definitions never change, so positions are stable keys.
            <li key={index}>
              <GlossaryItem glossary={definition} dictionaryId={dictionaryId} />
            </li>
          ))}
        </ol>
      </div>
      {entry.tags.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <li
              key={tag}
              className="rounded bg-surface-muted px-1.5 text-xs text-fg-muted"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
