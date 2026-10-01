import { ReaderToolbarButton } from "./ReaderToolbarButton.tsx";

/** A search field that steps through the matches with Enter, Shift+Enter, or the arrow buttons. */
export function ReaderSearchBox({
  query,
  matchIndex,
  matchCount,
  onQueryChanged,
  onStepped,
}: {
  query: string;
  matchIndex: number | null;
  matchCount: number;
  onQueryChanged: (query: string) => void;
  onStepped: (step: -1 | 1) => void;
}) {
  return (
    <search className="flex min-w-56 max-w-md flex-1 items-center gap-1">
      <input
        type="search"
        aria-label="Search"
        placeholder="Search"
        value={query}
        className="h-8 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2.5 placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:placeholder:text-stone-500 focus-visible:border-accent focus-visible:outline-1 focus-visible:outline-accent"
        onChange={(event) => onQueryChanged(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          onStepped(event.shiftKey ? -1 : 1);
        }}
      />
      <output
        aria-live="polite"
        className="whitespace-nowrap px-1 text-stone-500 text-xs dark:text-stone-400 tabular-nums"
      >
        {describeSearchStatus(query, matchIndex, matchCount)}
      </output>
      <ReaderToolbarButton
        aria-label="Previous match"
        disabled={matchCount === 0}
        onClick={() => onStepped(-1)}
      >
        ↑
      </ReaderToolbarButton>
      <ReaderToolbarButton
        aria-label="Next match"
        disabled={matchCount === 0}
        onClick={() => onStepped(1)}
      >
        ↓
      </ReaderToolbarButton>
    </search>
  );
}

function describeSearchStatus(
  query: string,
  matchIndex: number | null,
  matchCount: number,
): string {
  if (query.trim() === "") return "";
  if (matchCount === 0) return "No matches";
  if (matchIndex !== null) return `${matchIndex + 1} of ${matchCount}`;
  return matchCount === 1 ? "1 match" : `${matchCount} matches`;
}
