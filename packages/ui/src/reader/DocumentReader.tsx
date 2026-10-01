import type { Document } from "@easyimmerse/types";
import { useEffect, useRef, useState } from "react";
import {
  DocumentReaderChapter,
  type WordInContext,
} from "./DocumentReaderChapter.tsx";
import { ReaderTableOfContents } from "./ReaderTableOfContents.tsx";
import { ReaderToolbar } from "./ReaderToolbar.tsx";
import { defaultReaderSettings } from "./readerSettings.ts";
import type { ReadingPosition } from "./readingPosition.ts";
import { useDocumentSearch } from "./useDocumentSearch.ts";
import {
  paragraphIndexAttribute,
  useVisibleParagraph,
} from "./useVisibleParagraph.ts";

type ScrollRequest = {
  position: ReadingPosition;
  shouldFocusChapter: boolean;
};

/**
 * Shows a document one chapter at a time, with a toolbar for moving between chapters, searching, and changing the font.
 * The reader opens at `position` and then keeps its own position, reporting each change through `onPositionChanged`.
 */
export function DocumentReader({
  document,
  position,
  onPositionChanged,
  onWordHovered,
  onWordActivated,
}: {
  document: Document;
  position: ReadingPosition;
  onPositionChanged: (position: ReadingPosition) => void;
  onWordHovered: (event: WordInContext) => void;
  onWordActivated: (event: WordInContext) => void;
}) {
  const [currentPosition, setCurrentPosition] = useState(position);
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest>({
    position,
    shouldFocusChapter: false,
  });
  const [settings, setSettings] = useState(defaultReaderSettings);
  const [isTableOfContentsOpen, setTableOfContentsOpen] = useState(false);
  const search = useDocumentSearch(document);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  function moveTo(nextPosition: ReadingPosition, shouldFocusChapter = false) {
    setCurrentPosition(nextPosition);
    setScrollRequest({ position: nextPosition, shouldFocusChapter });
    onPositionChanged(nextPosition);
  }

  const paragraphsRef = useVisibleParagraph((paragraphIndex) => {
    if (paragraphIndex === currentPosition.paragraphIndex) return;
    const nextPosition = { ...currentPosition, paragraphIndex };
    setCurrentPosition(nextPosition);
    onPositionChanged(nextPosition);
  });

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) scrollToRequest(scrollArea, scrollRequest);
  }, [scrollRequest]);

  const { chapterIndex } = currentPosition;
  const chapter = document.chapters[chapterIndex];
  const shownMatch = search.shownMatch;
  return (
    <div className="flex h-full flex-col bg-stone-50 text-stone-900">
      <ReaderToolbar
        chapterIndex={chapterIndex}
        chapterCount={document.chapters.length}
        onChapterStepped={(step) =>
          moveTo({ chapterIndex: chapterIndex + step, paragraphIndex: 0 })
        }
        isTableOfContentsOpen={isTableOfContentsOpen}
        onTableOfContentsToggled={() =>
          setTableOfContentsOpen(!isTableOfContentsOpen)
        }
        settings={settings}
        onSettingsChanged={setSettings}
        searchQuery={search.query}
        searchMatchIndex={search.matchIndex}
        searchMatchCount={search.matchCount}
        onSearchQueryChanged={search.changeQuery}
        onSearchStepped={(step) => {
          const match = search.step(step);
          if (match) moveTo(match);
        }}
      />
      <div className="relative flex min-h-0 flex-1">
        {isTableOfContentsOpen && (
          <div className="absolute inset-0 z-10 bg-white sm:static sm:w-72 sm:shrink-0 sm:border-stone-200 sm:border-r">
            <ReaderTableOfContents
              chapters={document.chapters}
              currentIndex={chapterIndex}
              onSelect={(index) => {
                setTableOfContentsOpen(false);
                moveTo({ chapterIndex: index, paragraphIndex: 0 }, true);
              }}
            />
          </div>
        )}
        <div ref={scrollAreaRef} className="min-w-0 flex-1 overflow-y-auto">
          {chapter ? (
            <DocumentReaderChapter
              key={chapterIndex}
              chapter={chapter}
              chapterIndex={chapterIndex}
              language={document.language}
              settings={settings}
              highlightedParagraphIndex={
                shownMatch?.chapterIndex === chapterIndex
                  ? shownMatch.paragraphIndex
                  : null
              }
              paragraphsRef={paragraphsRef}
              onWordHovered={onWordHovered}
              onWordActivated={onWordActivated}
            />
          ) : (
            <p className="p-8 text-center text-stone-500">
              This document has no text.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function scrollToRequest(scrollArea: HTMLElement, request: ScrollRequest) {
  const { paragraphIndex } = request.position;
  const paragraph = scrollArea.querySelector(
    `[${paragraphIndexAttribute}="${paragraphIndex}"]`,
  );
  if (paragraphIndex === 0) scrollArea.scrollTop = 0;
  else paragraph?.scrollIntoView?.({ block: "start" });
  if (request.shouldFocusChapter)
    scrollArea.querySelector("h2")?.focus({ preventScroll: true });
}
