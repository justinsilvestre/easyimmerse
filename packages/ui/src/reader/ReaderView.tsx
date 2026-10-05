import type { Document } from "@easyimmerse/types";
import {
  type ReactNode,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useMediaQuery, wideScreenQuery } from "../hooks/useMediaQuery.ts";
import { AppearancePanel } from "./AppearancePanel.tsx";
import { ChapterEnd } from "./ChapterEnd.tsx";
import { ChapterText } from "./ChapterText.tsx";
import { ContentsPanel } from "./ContentsPanel.tsx";
import { sectionIndexAt, sectionsOf } from "./chapterSections.ts";
import { LookupAnchor } from "./LookupAnchor.tsx";
import {
  PagedChapter,
  type PageInfo,
  type PageTurner,
} from "./PagedChapter.tsx";
import { ReaderFooter } from "./ReaderFooter.tsx";
import { ReaderToolbar } from "./ReaderToolbar.tsx";
import {
  fontFamilies,
  fontSizesRem,
  lineHeights,
  lineLengthsEm,
  type ReaderPreferences,
} from "./readerPreferences.ts";
import {
  initialReaderState,
  type ReaderPanel,
  updateReader,
} from "./readerState.ts";
import {
  chapterStartProgresses,
  locationAtProgress,
  progressAt,
  type ReaderLocation,
  startOfBook,
} from "./readingProgress.ts";
import { ScrolledChapter } from "./ScrolledChapter.tsx";
import { SearchPanel } from "./SearchPanel.tsx";
import { searchDocument } from "./searchDocument.ts";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";
import { useReaderKeys } from "./useReaderKeys.ts";
import {
  clearWordHighlight,
  type ReaderWord,
  useWordPointer,
} from "./useWordPointer.ts";

export type ReaderCallbacks = {
  onBack: () => void;
  /** Opens the dictionary pop-up with a field to type a word into. */
  onLookup: () => void;
  onWordHover: (word: ReaderWord) => void;
  onWordClick: (word: ReaderWord) => void;
  /** A click or tap beside the dictionary pop-up and off the words, which closes it. */
  onDismissLookup: () => void;
  onLocationChange: (location: ReaderLocation) => void;
  onPreferencesChange: (preferences: ReaderPreferences) => void;
};

type ReaderViewProps = {
  document: Document;
  /** The book's title, or the file's name when the book has none. */
  title: string;
  /** The language of the text, which sets its word boundaries and hyphenation. */
  language: string;
  preferences: ReaderPreferences;
  initialLocation?: ReaderLocation;
  /** The panel open at first, for showing a panel in a story. */
  initialPanel?: ReaderPanel;
  initialSearchQuery?: string;
  callbacks: ReaderCallbacks;
  /** The dictionary pop-up, placed beside the word last looked up. */
  lookup?: ReactNode;
  /** Notices to show under the toolbar, such as the unsaved-work banner. */
  headerContent?: ReactNode;
};

const searchLimit = 500;
/**
 * The most text the paged layout lays out at once, about the length of a short novel.
 * Layout time grows with the text's length, so a longer chapter is shown in sections.
 */
const sectionCharacterLimit = 250_000;

/**
 * The screen for reading an ebook or a text file. The text fills the window, set like a
 * book; the toolbar and progress bar fade in when they are wanted. Words are looked up by
 * resting the pointer on them or tapping them, as in the subtitles.
 */
export function ReaderView(props: ReaderViewProps) {
  const { preferences, callbacks } = props;
  const document = useMemo(
    () => unwrapHardLineBreaks(props.document),
    [props.document],
  );
  const [state, dispatch] = useReducer(
    updateReader,
    props.initialLocation ?? startOfBook,
    (location) => ({
      ...initialReaderState(location),
      panel: props.initialPanel ?? null,
      search: { query: props.initialSearchQuery ?? "", activeMatchIndex: null },
    }),
  );
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [wordRect, setWordRect] = useState<DOMRect | null>(null);
  const turner = useRef<PageTurner>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const isWide = useMediaQuery(wideScreenQuery);
  const isPaged = preferences.layout === "pages";

  const query = useDeferredValue(state.search.query);
  const matches = useMemo(
    () => searchDocument(document, query, searchLimit),
    [document, query],
  );
  const chapterIndex = state.location.chapterIndex;
  const chapter = document.chapters[chapterIndex] ?? {
    title: null,
    paragraphs: [],
  };
  const sections = useMemo(
    () => sectionsOf(chapter.paragraphs, sectionCharacterLimit),
    [chapter],
  );
  const sectionIndex = sectionIndexAt(sections, state.location.paragraphIndex);
  const marks = useMemo(
    () =>
      matches.flatMap((match, index) =>
        match.chapterIndex === chapterIndex
          ? [{ ...match, isActive: index === state.search.activeMatchIndex }]
          : [],
      ),
    [matches, chapterIndex, state.search.activeMatchIndex],
  );
  const chapterStarts = useMemo(
    () => chapterStartProgresses(document),
    [document],
  );
  const progress = progressAt(document, state.location);

  const reportLocation = useEffectEvent(callbacks.onLocationChange);
  useEffect(() => reportLocation(state.location), [state.location]);
  const hasLookup = props.lookup != null;
  useEffect(() => {
    if (!hasLookup) clearWordHighlight();
  }, [hasLookup]);

  const jumpTo = (location: ReaderLocation) =>
    dispatch({ type: "jumped", location });
  const goToChapter = (index: number, edge: "start" | "end") => {
    const paragraphs = document.chapters[index]?.paragraphs;
    if (!paragraphs) return;
    const last = paragraphs.length - 1;
    jumpTo(
      edge === "start"
        ? { chapterIndex: index, paragraphIndex: 0, offset: 0 }
        : {
            chapterIndex: index,
            paragraphIndex: Math.max(0, last),
            offset: paragraphs[last]?.length ?? 0,
          },
    );
  };
  const goToSection = (index: number, edge: "start" | "end") => {
    const section = sections[index];
    if (!section) return goToChapter(chapterIndex + Math.sign(index), edge);
    const last = section.end - 1;
    jumpTo(
      edge === "start"
        ? { chapterIndex, paragraphIndex: section.start, offset: 0 }
        : {
            chapterIndex,
            paragraphIndex: last,
            offset: chapter.paragraphs[last]?.length ?? 0,
          },
    );
  };
  const turn = (direction: "next" | "previous") => {
    if (isPaged) turner.current?.[direction]();
    else goToChapter(chapterIndex + (direction === "next" ? 1 : -1), "start");
  };
  useReaderKeys({
    isPaged,
    isPanelOpen: state.panel !== null,
    onTurn: turn,
    onOpenSearch: () => {
      dispatch({ type: "panelOpened", panel: "search" });
      searchInput.current?.focus();
      searchInput.current?.select();
    },
    onLookup: callbacks.onLookup,
    onEscape: callbacks.onDismissLookup,
  });

  const wordPointer = useWordPointer(chapterIndex, props.language, {
    onWordHover: (word) => {
      setWordRect(word.rect);
      callbacks.onWordHover(word);
    },
    onWordClick: (word) => {
      setWordRect(word.rect);
      callbacks.onWordClick(word);
    },
    onBlankClick: (event) => {
      if (hasLookup) return callbacks.onDismissLookup();
      const share = event.clientX / window.innerWidth;
      if (isPaged && share < 0.25) turn("previous");
      else if (isPaged && share > 0.75) turn("next");
      else dispatch({ type: "chromeToggled" });
    },
  });

  const layoutKey = [
    preferences.font,
    preferences.fontSizeStep,
    preferences.lineSpacing,
    preferences.lineLength,
    preferences.isJustified,
  ].join();
  const text = (
    <ChapterText
      chapter={chapter}
      section={isPaged ? sections[sectionIndex] : undefined}
      language={props.language}
      isJustified={preferences.isJustified}
      skipsOffscreenLayout={!isPaged}
      marks={marks}
    />
  );
  const chapterTitle =
    chapter.title ??
    (document.chapters.length > 1 ? `Chapter ${chapterIndex + 1}` : null);
  const showChrome = () => dispatch({ type: "chromeShown" });
  const closePanelOnPhone = () => {
    if (!isWide) dispatch({ type: "panelClosed" });
  };

  return (
    <div
      data-theme={preferences.theme === "auto" ? undefined : preferences.theme}
      className="relative h-dvh overflow-hidden bg-canvas text-fg"
      onPointerMove={(event) => {
        const isNearEdge =
          event.clientY < 56 || event.clientY > window.innerHeight - 56;
        if (event.pointerType === "mouse" && isNearEdge) showChrome();
      }}
    >
      <ReaderToolbar
        title={props.title}
        chapterTitle={chapterTitle}
        isVisible={state.isChromeVisible}
        panel={state.panel}
        hasContents={document.chapters.length > 1}
        headerContent={props.headerContent}
        onBack={callbacks.onBack}
        onLookup={callbacks.onLookup}
        onTogglePanel={(panel) => dispatch({ type: "panelToggled", panel })}
        onReveal={showChrome}
      />
      <main
        key={chapterIndex}
        className="absolute inset-0 touch-manipulation transition-opacity duration-300 starting:opacity-0"
        style={{
          fontFamily: fontFamilies[preferences.font],
          fontSize: `${fontSizesRem[preferences.fontSizeStep] ?? 1}rem`,
          lineHeight: lineHeights[preferences.lineSpacing],
        }}
        {...wordPointer}
      >
        {isPaged ? (
          <div className="h-full pt-14 pb-10">
            <PagedChapter
              ref={turner}
              chapterIndex={chapterIndex}
              initialLocation={state.location}
              jump={state.jump}
              layoutKey={layoutKey}
              maxColumnWidthEm={lineLengthsEm[preferences.lineLength]}
              onLocationChange={(location) => {
                dispatch({ type: "locationReported", location });
                dispatch({ type: "chromeHidden" });
              }}
              onPageChange={setPageInfo}
              onPastEnd={() => goToSection(sectionIndex + 1, "start")}
              onBeforeStart={() => goToSection(sectionIndex - 1, "end")}
            >
              {text}
            </PagedChapter>
          </div>
        ) : (
          <ScrolledChapter
            chapterIndex={chapterIndex}
            initialLocation={state.location}
            jump={state.jump}
            layoutKey={layoutKey}
            maxColumnWidthEm={lineLengthsEm[preferences.lineLength]}
            onLocationChange={(location) =>
              dispatch({ type: "locationReported", location })
            }
            onScrollDirection={(direction) =>
              dispatch({
                type: direction === "down" ? "chromeHidden" : "chromeShown",
              })
            }
            footer={
              <ChapterEnd
                nextTitle={
                  document.chapters[chapterIndex + 1]
                    ? (document.chapters[chapterIndex + 1]?.title ??
                      `Chapter ${chapterIndex + 2}`)
                    : null
                }
                onNext={() => goToChapter(chapterIndex + 1, "start")}
              />
            }
          >
            {text}
          </ScrolledChapter>
        )}
      </main>
      <ReaderFooter
        progress={progress}
        pageInfo={isPaged && sections.length === 1 ? pageInfo : null}
        chapterTitle={chapterTitle}
        chapterStarts={chapterStarts}
        isVisible={state.isChromeVisible}
        chapterTitleAt={(at) => {
          const index = locationAtProgress(document, at).chapterIndex;
          return document.chapters[index]?.title ?? null;
        }}
        onScrub={(at) => jumpTo(locationAtProgress(document, at))}
        onReveal={showChrome}
      />
      {props.lookup && (
        <LookupAnchor wordRect={wordRect} isWide={isWide}>
          {props.lookup}
        </LookupAnchor>
      )}
      {state.panel === "contents" && (
        <ContentsPanel
          document={document}
          title={props.title}
          currentChapterIndex={chapterIndex}
          progress={progress}
          onChooseChapter={(index) => {
            goToChapter(index, "start");
            dispatch({ type: "panelClosed" });
          }}
          onClose={() => dispatch({ type: "panelClosed" })}
        />
      )}
      {state.panel === "search" && (
        <SearchPanel
          document={document}
          query={state.search.query}
          matches={matches}
          isTruncated={matches.length >= searchLimit}
          activeMatchIndex={state.search.activeMatchIndex}
          inputRef={searchInput}
          onQueryChange={(value) =>
            dispatch({ type: "searchChanged", query: value })
          }
          onChooseMatch={(index) => {
            const match = matches[index];
            if (!match) return;
            dispatch({
              type: "matchChosen",
              index,
              location: {
                chapterIndex: match.chapterIndex,
                paragraphIndex: match.paragraphIndex,
                offset: match.start,
              },
            });
            closePanelOnPhone();
          }}
          onClose={() => dispatch({ type: "panelClosed" })}
        />
      )}
      {state.panel === "appearance" && (
        <AppearancePanel
          preferences={preferences}
          onChange={callbacks.onPreferencesChange}
          onClose={() => dispatch({ type: "panelClosed" })}
        />
      )}
    </div>
  );
}
