import {
  actions,
  isReaderPaged,
  type ReaderPreferences,
  type ReaderScreenAction,
  type ReaderScreenState,
  type ReaderViewMode,
} from "@easyimmerse/state";
import type { Document, TextSpan, TranslationLink } from "@easyimmerse/types";
import {
  type MouseEvent,
  type ReactNode,
  useDeferredValue,
  useMemo,
  useRef,
} from "react";
import { useMediaQuery, wideScreenQuery } from "../hooks/useMediaQuery.ts";
import type { AnchorRect } from "../lookup/placeAtAnchor.ts";
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
import { PagedChapter } from "./PagedChapter.tsx";
import { ReaderFooter } from "./ReaderFooter.tsx";
import { ReaderToolbar } from "./ReaderToolbar.tsx";
import type { ReaderAudio } from "./readerAudio.ts";
import { type ReaderControls, useReaderControls } from "./readerControls.ts";
import type { ReaderCursor } from "./readerCursor.ts";
import {
  fontFamilies,
  fontSizesRem,
  lineHeights,
  lineLengthsEm,
} from "./readerPreferences.ts";
import { translatedHighlightName } from "./readerTextHighlights.ts";
import type { ReaderTranslation } from "./readerTranslation.ts";
import {
  chapterStartProgresses,
  locationAtProgress,
  progressAt,
  type ReaderLocation,
} from "./readingProgress.ts";
import { ScrolledChapter } from "./ScrolledChapter.tsx";
import { SearchPanel } from "./SearchPanel.tsx";
import { searchDocument } from "./searchDocument.ts";
import { spokenSpansShown } from "./spokenSpansShown.ts";
import { TranslationPanel } from "./TranslationPanel.tsx";
import {
  type HighlightedWord,
  useLookedUpHighlight,
} from "./useLookedUpHighlight.ts";
import { useParagraphsNearView } from "./useParagraphsNearView.ts";
import { useReaderKeyboardCursor } from "./useReaderKeyboardCursor.ts";
import { useSpokenHighlight } from "./useSpokenHighlight.ts";
import { useTextHighlight } from "./useTextHighlight.ts";
import { useTranslationView } from "./useTranslationView.ts";
import {
  type ReaderWord,
  type ReaderWordGestures,
  useWordPointer,
} from "./useWordPointer.ts";

export type ReaderCallbacks = ReaderWordGestures & {
  onBack: () => void;
  /** Opens the dictionary pop-up with a field to type a word into. */
  onLookup: () => void;
  /** A click or tap beside the dictionary pop-up and off the words, which closes it. */
  onDismissLookup: () => void;
  /** The pointer entering or leaving the dictionary pop-up. */
  onPointerInsideLookupChange?: (isInside: boolean) => void;
  onPreferencesChange: (preferences: ReaderPreferences) => void;
};

/** The actions the reader view dispatches. */
export type ReaderViewAction =
  | ReaderScreenAction
  | ReturnType<typeof actions.readingLocationReported>;

type ReaderViewProps = {
  /** The book's media file, under which the reader's place is stored. */
  mediaFileId: string;
  /** The book's text, with its hard line breaks already unwrapped. */
  document: Document;
  /** The reader's place, which the text shows and keeps through changes of layout. */
  location: ReaderLocation;
  reader: ReaderScreenState;
  /** The view shown: the one chosen once the translation it needs is ready, as `selectShownReaderViewMode` decides. */
  viewMode: ReaderViewMode;
  /** The lookup cursor's place in the text, which the keyboard steps through the text when it placed the cursor there. */
  cursor?: ReaderCursor | null;
  dispatch: (action: ReaderViewAction) => void;
  /** The book's title, or the file's name when the book has none. */
  title: string;
  /** The name of the project the book belongs to, which the way back is named after. */
  projectName: string;
  /** The language of the text, which sets its word boundaries and hyphenation. */
  language: string;
  preferences: ReaderPreferences;
  callbacks: ReaderCallbacks;
  /** The dictionary pop-up, placed beside `lookupRect`. */
  lookup?: ReactNode;
  /** The pop-up's size, which sets how it is placed. */
  lookupSize?: PopupSize;
  /** Where the word of the text the pop-up opened on lies in the window, which the pop-up stands beside. */
  lookupRect?: AnchorRect | null;
  /**
   * The word of the text the pop-up shows, which is highlighted as in the subtitles once its lookup has answered:
   * a word written with spaces whole, and in a script without spaces the characters the lookup matched,
   * or the character it looked up from when `matchedLength` is null because nothing matched.
   */
  highlightedWord?: { word: HighlightedWord; matchedLength?: number | null };
  /** The text whose translation the dictionary pop-up's sentence row shows, highlighted as the sentence the translation covers. */
  highlightedSentence?: readonly TextSpan[];
  /** Notices to show under the toolbar, such as the unsaved-work banner. */
  headerContent?: ReactNode;
  /** A panel laid over the text at the side, such as the flashcard editor. */
  sidePanel?: ReactNode;
  /** The parts of the view that the reader's keys work, from the screen that binds the keys. */
  controls?: ReaderControls;
  /** The audio the book is aligned with, which plays its sentences and shows the one being spoken; absent when it has none. */
  audio?: ReaderAudio;
  /** The book's translation and how to pair one, for the translation panel and the views that show it. None where absent. */
  translation?: ReaderTranslation;
};

const searchLimit = 500;
/** The links of a translation shown without an alignment, kept as one array so that the spoken text keeps its identity. */
const noLinks: readonly TranslationLink[] = [];
const noSpans: readonly TextSpan[] = [];
/**
 * The most text the paged layout lays out at once, about the length of a short novel.
 * Layout time grows with the text's length, so a longer chapter is shown in sections.
 */
const sectionCharacterLimit = 250_000;

/**
 * The screen for reading an ebook or a text file.
 * The text fills the window, set like a book; the toolbar and progress bar fade in when they are wanted.
 * Words are looked up and turned into flashcards with the same gestures as in the subtitles.
 * In a book aligned with audio, a Ctrl-click or Cmd-click on a word plays its sentence, the sentence being spoken is highlighted,
 * and the text follows it, as `useSpokenHighlight` describes. In a book aligned with its translation, a held word opens the dictionary pop-up
 * with its sentence's translation, and the sentence is highlighted while the translation shows.
 * The keys do the same for the current sentence, as `selectReaderKeyBinding` in the state package describes.
 * The text is one region the keyboard reaches with Tab, through which the arrow keys move the lookup cursor,
 * as `useReaderKeyboardCursor` describes.
 */
export function ReaderView(props: ReaderViewProps) {
  const { reader, dispatch, translation } = props;
  const { preferences, callbacks } = props;
  // In the translation-only view, the translation's text, place and language stand in for the book's.
  const shown = useTranslationView(props);
  const { document, location, language } = shown;
  const { viewMode } = props;
  const ownControls = useReaderControls();
  const {
    pageTurner: turner,
    searchInput,
    cursorStepper,
  } = props.controls ?? ownControls;
  const isWide = useMediaQuery(wideScreenQuery);
  const isPaged = isReaderPaged(preferences.layout, viewMode);

  const query = useDeferredValue(reader.search.query);
  const matches = useMemo(
    () => searchDocument(document, query, searchLimit),
    [document, query],
  );
  const chapterIndex = location.chapterIndex;
  const chapter = document.chapters[chapterIndex] ?? {
    title: null,
    paragraphs: [],
  };
  const sections = useMemo(
    () => sectionsOf(chapter.paragraphs, sectionCharacterLimit),
    [chapter],
  );
  const sectionIndex = sectionIndexAt(sections, location.paragraphIndex);
  const shownSection = isPaged ? sections[sectionIndex] : undefined;
  /** The text the lookup cursor moves through: the section shown, or the whole chapter in the scrolling layout. */
  const chapterText = useMemo(
    () => ({
      chapterIndex,
      paragraphs: chapter.paragraphs,
      section: shownSection ?? { start: 0, end: chapter.paragraphs.length },
      language,
    }),
    [chapterIndex, chapter, shownSection, language],
  );
  const marks = useMemo(
    () =>
      matches.flatMap((match, index) =>
        match.chapterIndex === chapterIndex
          ? [{ ...match, isActive: index === reader.search.activeMatchIndex }]
          : [],
      ),
    [matches, chapterIndex, reader.search.activeMatchIndex],
  );
  const chapterStarts = useMemo(
    () => chapterStartProgresses(document),
    [document],
  );
  const progress = progressAt(document, location);

  const textContainer = useRef<HTMLElement>(null);
  const shownText = useMemo(
    () => [
      chapter,
      sectionIndex,
      layoutKeyOf(preferences),
      shown.chapterTranslation,
    ],
    [chapter, sectionIndex, preferences, shown.chapterTranslation],
  );
  // The paragraphs near the view are the book's, whose words are looked up ahead; the translation's are not.
  useParagraphsNearView(textContainer, isPaged, shownText, (span) => {
    if (!shown.isTranslationShown)
      dispatch(actions.readerNearSpanMeasured(span));
  });
  const hasLookup = props.lookup != null;
  useLookedUpHighlight(
    shown.isTranslationShown ? undefined : props.highlightedWord,
  );

  const { jumpTo } = shown;
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
  const spoken = props.audio?.spokenSpan ?? null;
  const shownLinks = shown.isTranslationShown
    ? (translation?.links ?? noLinks)
    : null;
  const spokenSpans = useMemo(
    () => spokenSpansShown(spoken, document, shownLinks),
    [spoken, document, shownLinks],
  );
  useSpokenHighlight(
    textContainer,
    spokenSpans,
    props.audio?.isPlaying ?? false,
    shownText,
    (span) =>
      jumpTo({
        chapterIndex: span.chapter_index,
        paragraphIndex: span.paragraph_index,
        offset: span.start,
      }),
  );
  useTextHighlight(
    textContainer,
    translatedHighlightName,
    shown.isTranslationShown ? noSpans : (props.highlightedSentence ?? noSpans),
    shownText,
  );
  const { playAt } = props.audio ?? {};
  const playWord = playAt && ((word: ReaderWord) => playAt(word.location));
  const turn = (direction: "next" | "previous") => {
    if (isPaged) turner.current?.[direction]();
    else goToChapter(chapterIndex + (direction === "next" ? 1 : -1), "start");
  };
  const keyboard = useReaderKeyboardCursor({
    container: textContainer,
    text: chapterText,
    location,
    cursor: props.cursor ?? null,
    pending: reader.pendingCursor,
    spokenSpan: spoken,
    layoutVersion: `${reader.jumpCount}:${reader.pageInfo?.page}:${reader.pageInfo?.pageCount}`,
    isPaged,
    isDisabled: shown.isTranslationShown,
    stepper: cursorStepper,
    gestures: callbacks,
    dispatch,
    jumpTo,
    movePast: (direction) => {
      const step = direction === "forward" ? 1 : -1;
      const edge = direction === "forward" ? "start" : "end";
      const next = sectionIndex + step;
      if (isPaged && sections[next]) {
        goToSection(next, edge);
        return true;
      }
      if (!document.chapters[chapterIndex + step]) return false;
      goToChapter(chapterIndex + step, edge);
      return true;
    },
  });

  const onBlankClick = (event: MouseEvent<HTMLElement>) => {
    if (hasLookup) return callbacks.onDismissLookup();
    const share = event.clientX / window.innerWidth;
    if (isPaged && share < 0.25) turn("previous");
    else if (isPaged && share > 0.75) turn("next");
    else dispatch(actions.readerChromeToggled());
  };
  const wordPointer = useWordPointer(chapterIndex, language, {
    onWordClick: callbacks.onWordClick,
    onWordDoubleClick: callbacks.onWordDoubleClick,
    onWordPointed: callbacks.onWordPointed,
    onWordHover: callbacks.onWordHover,
    onWordCommandClick: playWord,
    onWordHold: callbacks.onWordHold,
    onBlankClick,
  });
  // The words of the translation are not looked up, since the dictionaries are for the book's language.
  const pointerProps = shown.isTranslationShown
    ? { onClick: onBlankClick }
    : wordPointer;

  const layoutKey = layoutKeyOf(preferences);
  const text = (
    <ChapterText
      chapter={chapter}
      section={shownSection}
      language={language}
      isJustified={preferences.isJustified}
      skipsOffscreenLayout={!isPaged}
      marks={marks}
      translation={shown.chapterTranslation}
    />
  );
  const chapterTitle = chapterTitleOf(document, chapterIndex);
  const showChrome = () => dispatch(actions.readerChromeShown());
  const closePanel = () => dispatch(actions.readerPanelClosed());
  const closePanelOnPhone = () => {
    if (!isWide) closePanel();
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
        isVisible={reader.isChromeVisible}
        panel={reader.panel}
        hasContents={document.chapters.length > 1}
        hasTranslation={translation !== undefined}
        headerContent={props.headerContent}
        onBack={callbacks.onBack}
        onLookup={callbacks.onLookup}
        onTogglePanel={(panel) => dispatch(actions.readerPanelToggled(panel))}
        onReveal={showChrome}
      />
      <main
        ref={textContainer}
        key={`${viewMode}:${chapterIndex}`}
        aria-label="Text"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter Escape"
        className="absolute inset-0 touch-manipulation outline-none transition-opacity duration-300 starting:opacity-0"
        {...keyboard.textProps}
        style={{
          fontFamily: fontFamilies[preferences.font],
          fontSize: `${fontSizesRem[preferences.fontSizeStep] ?? 1}rem`,
          lineHeight: lineHeights[preferences.lineSpacing],
        }}
        {...pointerProps}
      >
        {isPaged ? (
          <div className="h-full pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
            <PagedChapter
              ref={turner}
              chapterIndex={chapterIndex}
              location={location}
              jumpCount={reader.jumpCount}
              layoutKey={layoutKey}
              maxColumnWidthEm={lineLengthsEm[preferences.lineLength]}
              onLocationChange={(reported) => {
                shown.reportLocation(reported);
                dispatch(actions.readerChromeHidden());
              }}
              onPageMeasured={(info) =>
                dispatch(actions.readerPageMeasured(info))
              }
              onPastEnd={() => goToSection(sectionIndex + 1, "start")}
              onBeforeStart={() => goToSection(sectionIndex - 1, "end")}
            >
              {text}
            </PagedChapter>
          </div>
        ) : (
          <ScrolledChapter
            chapterIndex={chapterIndex}
            location={location}
            jumpCount={reader.jumpCount}
            layoutKey={layoutKey}
            maxColumnWidthEm={
              // The parallel view sets two columns of the chosen length side by side, with a gap of 2em.
              viewMode === "parallel"
                ? lineLengthsEm[preferences.lineLength] * 2 + 2
                : lineLengthsEm[preferences.lineLength]
            }
            onLocationChange={shown.reportLocation}
            onScrollDirection={(direction) =>
              dispatch(
                direction === "down"
                  ? actions.readerChromeHidden()
                  : actions.readerChromeShown(),
              )
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
      {/* One region outside the text, where screen readers announce the cursor's place reliably. */}
      <span aria-live="polite" className="sr-only">
        {keyboard.announcement}
      </span>
      <ReaderFooter
        progress={progress}
        pageInfo={isPaged && sections.length === 1 ? reader.pageInfo : null}
        chapterTitle={chapterTitle}
        chapterStarts={chapterStarts}
        isVisible={reader.isChromeVisible}
        audioBar={props.audio?.bar}
        chapterTitleAt={(at) =>
          chapterTitleOf(
            document,
            locationAtProgress(document, at).chapterIndex,
          )
        }
        onScrub={(at) => jumpTo(locationAtProgress(document, at))}
        onReveal={showChrome}
      />
      {props.audio?.dialogs}
      {props.lookup && (
        <LookupAnchor
          wordRect={props.lookupRect ?? null}
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
      {reader.panel === "contents" && (
        <ContentsPanel
          document={document}
          title={props.title}
          currentChapterIndex={chapterIndex}
          progress={progress}
          onChooseChapter={(index) => {
            goToChapter(index, "start");
            closePanel();
          }}
          onClose={closePanel}
        />
      )}
      {reader.panel === "search" && (
        <SearchPanel
          document={document}
          query={reader.search.query}
          matches={matches}
          isTruncated={matches.length >= searchLimit}
          activeMatchIndex={reader.search.activeMatchIndex}
          inputRef={searchInput}
          onQueryChange={(value) =>
            dispatch(actions.readerSearchChanged(value))
          }
          onChooseMatch={(index) => {
            const match = matches[index];
            if (!match) return;
            shown.chooseMatch(index, {
              chapterIndex: match.chapterIndex,
              paragraphIndex: match.paragraphIndex,
              offset: match.start,
            });
            closePanelOnPhone();
          }}
          onClose={closePanel}
        />
      )}
      {reader.panel === "appearance" && (
        <AppearancePanel
          preferences={preferences}
          layoutNote={
            viewMode === "parallel"
              ? "The parallel view always scrolls, so that each paragraph stays beside its translation."
              : undefined
          }
          onChange={callbacks.onPreferencesChange}
          onClose={closePanel}
        />
      )}
      {reader.panel === "translation" && translation && (
        <TranslationPanel
          candidates={translation.candidates}
          paired={translation.paired}
          isAligned={translation.links !== null}
          viewMode={viewMode}
          viewModes={shown.viewModes}
          onChoose={translation.onChoose}
          onViewModeChange={shown.chooseViewMode}
          onCombine={translation.onCombine}
          onClose={closePanel}
        />
      )}
      {translation?.dialog}
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
