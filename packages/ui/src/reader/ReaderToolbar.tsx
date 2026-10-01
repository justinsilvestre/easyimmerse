import { ReaderFontControls } from "./ReaderFontControls.tsx";
import { ReaderSearchBox } from "./ReaderSearchBox.tsx";
import { ReaderToolbarButton } from "./ReaderToolbarButton.tsx";
import type { ReaderSettings } from "./readerSettings.ts";

/** The controls above the reader's text: table of contents, chapter navigation, search, and font settings. */
export function ReaderToolbar(props: {
  chapterIndex: number;
  chapterCount: number;
  onChapterStepped: (step: -1 | 1) => void;
  isTableOfContentsOpen: boolean;
  onTableOfContentsToggled: () => void;
  settings: ReaderSettings;
  onSettingsChanged: (settings: ReaderSettings) => void;
  searchQuery: string;
  searchMatchIndex: number | null;
  searchMatchCount: number;
  onSearchQueryChanged: (query: string) => void;
  onSearchStepped: (step: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-line border-b bg-surface px-3 py-2 text-sm text-fg-soft">
      <div className="flex items-center gap-1">
        <ReaderToolbarButton
          aria-expanded={props.isTableOfContentsOpen}
          onClick={props.onTableOfContentsToggled}
        >
          <span aria-hidden="true">☰</span>
          Contents
        </ReaderToolbarButton>
        <ReaderToolbarButton
          aria-label="Previous chapter"
          disabled={props.chapterIndex <= 0}
          onClick={() => props.onChapterStepped(-1)}
        >
          ‹
        </ReaderToolbarButton>
        <span className="whitespace-nowrap px-1 text-fg-muted tabular-nums">
          Chapter {props.chapterIndex + 1} of {props.chapterCount}
        </span>
        <ReaderToolbarButton
          aria-label="Next chapter"
          disabled={props.chapterIndex >= props.chapterCount - 1}
          onClick={() => props.onChapterStepped(1)}
        >
          ›
        </ReaderToolbarButton>
      </div>
      <ReaderSearchBox
        query={props.searchQuery}
        matchIndex={props.searchMatchIndex}
        matchCount={props.searchMatchCount}
        onQueryChanged={props.onSearchQueryChanged}
        onStepped={props.onSearchStepped}
      />
      <ReaderFontControls
        settings={props.settings}
        onSettingsChanged={props.onSettingsChanged}
      />
    </div>
  );
}
