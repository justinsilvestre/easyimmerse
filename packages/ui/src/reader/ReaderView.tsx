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
import type { PopupSize } from "../lookup/popupSize.ts";
import { AppearancePanel } from "./AppearancePanel.tsx";
import { ChapterEnd } from "./ChapterEnd.tsx";
import { ChapterText } from "./ChapterText.tsx";
import { ContentsPanel } from "./ContentsPanel.tsx";
import {
  locationAtSectionEdge,
  sectionIndexAt,
  sectionsOf,
} from "./chapterSections.ts";
import { chapterLabelOf, chapterTitleOf } from "./chapterTitles.ts";
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
  clampToBook,
  locationAtProgress,
  progressAt,
  type ReaderLocation,
  startOfBook,
} from "./readingProgress.ts";
import { ScrolledChapter } from "./ScrolledChapter.tsx";
import { SearchPanel } from "./SearchPanel.tsx";
import { searchDocument } from "./searchDocument.ts";
import { sentencesNearView } from "./sentencesNearView.ts";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";
import { useLookedUpHighlight } from "./useLookedUpHighlight.ts";
import { useParagraphsNearView } from "./useParagraphsNearView.ts";
import { useReaderKeys } from "./useReaderKeys.ts";
import {
  type ReaderWord,
  type ReaderWordGestures,
  useWordPointer,
} from "./useWordPointer.ts";

export type ReaderCallbacks = ReaderWordGestures & {
  onBack: () => void;
  /** Opens the dictionary pop-up with a field to type a word into. */
  onLookup: () => void;
  /** The L key, which does what `onLookup` does unless this says otherwise, as looking up the word under the mouse. */
  onLookupKey?: () => void;
  /** Escape, or a click or tap beside the dictionary pop-up and off the words, which closes it. */
  onDismissLookup: () => void;
  /** The pointer entering or leaving the dictionary pop-up. */
  onPointerInsideLookupChange?: (isInside: boolean) => void;
  onLocationChange: (location: ReaderLocation) => void;
  /** Receives the sentences near the view, as `sentencesNearView` picks them, each time the view moves. */
  onNearbySentencesChange?: (sentences: readonly string[]) => void;
  onPreferencesChange: (preferences: ReaderPreferences) => void;
};

type ReaderViewProps = {
  document: Document;
  /** The book's title, or the file's name when the book has none. */
  title: string;
  /** The name of the project the book belongs to, which the way back is named after. */
  projectName: string;
  /** The language of the text, which sets its word boundaries and hyphenation. */
  language: string;
  preferences: ReaderPreferences;
  /** Where to open the book. A place past the end of the book opens at the end. */
  initialLocation?: ReaderLocation;
  /** The panel open at first, for showing a panel in a story. */
  initialPanel?: ReaderPanel;
  initialSearchQuery?: string;
  callbacks: ReaderCallbacks;
  /** The dictionary pop-up, placed beside `lookupWord`. */
  lookup?: ReactNode;
  /** The pop-up's size, which sets how it is placed. */
  lookupSize?: PopupSize;
  /** The word of the text the pop-up opened on, which it stands beside. */
  lookupWord?: ReaderWord;
  /**
   * The word of the text the pop-up shows, which is highlighted as in the subtitles:
   * a word written with spaces whole, and in a script without spaces the characters the lookup matched,
   * or, until `matchedLength` is known, the character it looks up from.
   */
  highlightedWord?: { word: ReaderWord; matchedLength?: number };
  /** Notices to show under the toolbar, such as the unsaved-work banner. */
  headerContent?: ReactNode;
  /** A panel laid over the text at the side, such as the flashcard editor. The reader's keys leave it alone. */
  sidePanel?: ReactNode;
};

const searchLimit = 500;
/**
 * The most text the paged layout lays out at once, about the length of a short novel.
 * Layout time grows with the text's length, so a longer chapter is shown in sections.
 */
const sectionCharacterLimit = 250_000;

/**
 * The screen for reading an ebook or a text file.
 * The text fills the window, set like a book; the toolbar and progress bar fade in when they are wanted.
 * Words are looked up and turned into flashcards with the same gestures as in the subtitles.
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
      ...initialReaderState(clampToBook(document, location)),
      panel: props.initialPanel ?? null,
      search: { query: props.initialSearchQuery ?? "", activeMatchIndex: null },
    }),
  );
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
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
  useEffect(() => {
    reportLocation(state.location);
  }, [state.location]);
  const textContainer = useRef<HTMLElement>(null);
  const shownText = useMemo(
    () => [chapter, sectionIndex, layoutKeyOf(preferences)],
    [chapter, sectionIndex, preferences],
  );
  const measuredNear = useParagraphsNearView(textContainer, isPaged, shownText);
  const reportNearby = useEffectEvent((sentences: readonly string[]) =>
    callbacks.onNearbySentencesChange?.(sentences),
  );
  const { paragraphIndex, offset } = state.location;
  const nearFirst = measuredNear?.first ?? paragraphIndex;
  const nearLast = measuredNear?.last ?? paragraphIndex;
  useEffect(() => {
    const paragraphs = document.chapters[chapterIndex]?.paragraphs ?? [];
    const near = { first: nearFirst, last: nearLast };
    const place = { paragraphIndex, offset };
    reportNearby(sentencesNearView(paragraphs, near, place, props.language));
  }, [
    document,
    chapterIndex,
    nearFirst,
    nearLast,
    paragraphIndex,
    offset,
    props.language,
  ]);
  const hasLookup = props.lookup != null;
  useLookedUpHighlight(props.highlightedWord);

  const jumpTo = (location: ReaderLocation) =>
    dispatch({ type: "jumped", location });
  const goToChapter = (index: number, edge: "start" | "end") => {
    const paragraphs = document.chapters[index]?.paragraphs;
    if (!paragraphs) return;
    const whole = { start: 0, end: paragraphs.length };
    jumpTo(locationAtSectionEdge(index, paragraphs, whole, edge));
  };
  /** Moves to a section of the chapter, or on to the neighbouring chapter past either end. */
  const goToSection = (index: number, edge: "start" | "end") => {
    const section = sections[index];
    if (section)
      jumpTo(
        locationAtSectionEdge(chapterIndex, chapter.paragraphs, section, edge),
      );
    else goToChapter(index < 0 ? chapterIndex - 1 : chapterIndex + 1, edge);
  };
  const turn = (direction: "next" | "previous") => {
    if (isPaged) turner.current?.[direction]();
    else goToChapter(chapterIndex + (direction === "next" ? 1 : -1), "start");
  };
  useReaderKeys({
    isPaged,
    isPanelOpen: state.panel !== null || props.sidePanel != null,
    onTurn: turn,
    onOpenSearch: () => {
      dispatch({ type: "panelOpened", panel: "search" });
      searchInput.current?.focus();
      searchInput.current?.select();
    },
    onLookup: callbacks.onLookupKey ?? callbacks.onLookup,
    onEscape: callbacks.onDismissLookup,
  });

  const wordPointer = useWordPointer(chapterIndex, props.language, {
    onWordClick: callbacks.onWordClick,
    onWordDoubleClick: callbacks.onWordDoubleClick,
    onWordPointed: callbacks.onWordPointed,
    onWordHover: callbacks.onWordHover,
    onWordHoverAnswered: callbacks.onWordHoverAnswered,
    onWordHold: callbacks.onWordHold,
    onBlankClick: (event) => {
      if (hasLookup) return callbacks.onDismissLookup();
      const share = event.clientX / window.innerWidth;
      if (isPaged && share < 0.25) turn("previous");
      else if (isPaged && share > 0.75) turn("next");
      else dispatch({ type: "chromeToggled" });
    },
  });

  const layoutKey = layoutKeyOf(preferences);
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
  const chapterTitle = chapterTitleOf(document, chapterIndex);
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
        projectName={props.projectName}
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
        ref={textContainer}
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
          <div className="h-full pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
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
                  chapterIndex + 1 < document.chapters.length
                    ? chapterLabelOf(document, chapterIndex + 1)
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
        chapterTitleAt={(at) =>
          chapterTitleOf(
            document,
            locationAtProgress(document, at).chapterIndex,
          )
        }
        onScrub={(at) => jumpTo(locationAtProgress(document, at))}
        onReveal={showChrome}
      />
      {props.lookup && (
        <LookupAnchor
          wordRect={props.lookupWord?.rect ?? null}
          isWide={isWide}
          size={props.lookupSize}
          onPointerInsideChange={callbacks.onPointerInsideLookupChange}
        >
          {props.lookup}
        </LookupAnchor>
      )}
      {props.sidePanel && (
        <aside className="fixed inset-x-0 bottom-0 z-30 flex h-[70dvh] flex-col p-2 md:inset-y-0 md:left-auto md:h-auto md:w-96">
          {props.sidePanel}
        </aside>
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

/** Changes whenever a preference that moves the text changes, such as the font size. */
function layoutKeyOf(preferences: ReaderPreferences): string {
  return [
    preferences.font,
    preferences.fontSizeStep,
    preferences.lineSpacing,
    preferences.lineLength,
    preferences.isJustified,
  ].join();
}
