import {
  actions,
  type PendingReaderCursor,
  type ReaderCursorStep,
  type ReaderLocation,
  type TextDirection,
} from "@easyimmerse/state";
import type { TextSpan } from "@easyimmerse/types";
import {
  type FocusEvent,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { runLookupEnd } from "../components/runLookupStarts.ts";
import type { ReaderViewAction } from "./ReaderView.tsx";
import type { ReaderCursor } from "./readerCursor.ts";
import {
  type ChapterText,
  type CursorLanding,
  continueWith,
  firstWordFrom,
  lastWordIn,
  type MatchedLengthAtLocation,
  stepReaderCursor,
} from "./readerCursorStep.ts";
import { isRangeInView } from "./readerTextHighlights.ts";
import { anchorRangeOf, readerWordAt } from "./readerWordAt.ts";
import { paragraphAttribute } from "./textOffsets.ts";
import { readerViewportAttribute } from "./useParagraphsNearView.ts";
import type { ReaderWordGestures } from "./useWordPointer.ts";

/** Moves the lookup cursor the keyboard placed through the text, as the arrow keys ask. */
export type CursorStepper = (step: ReaderCursorStep) => void;

type KeyboardCursorProps = {
  /** The element that holds the text, which is the one region the keyboard reaches. */
  container: RefObject<HTMLElement | null>;
  text: ChapterText;
  /** The reading location, which tells the first word of the page in view. */
  location: ReaderLocation;
  cursor: ReaderCursor | null;
  pending: PendingReaderCursor | null;
  /** The text being spoken, which the cursor goes to when the text gains focus during playback. */
  spokenSpan: TextSpan | null;
  /** Changes whenever the text in view moves, as when a page is measured or a jump lands, so that a waiting placement is tried again. */
  layoutVersion: string;
  isPaged: boolean;
  /** True while the translation is shown in the book's place, whose words are not looked up. */
  isDisabled: boolean;
  /** Set to the function that steps the cursor, for the keys bound beside the view. */
  stepper: RefObject<CursorStepper | null>;
  gestures: Pick<
    ReaderWordGestures,
    "onWordPointed" | "onWordHover" | "lookUpMatchedLength"
  >;
  dispatch: (action: ReaderViewAction) => void;
  /** Moves the reader to a place, so that the text there comes into view. */
  jumpTo: (location: ReaderLocation) => void;
  /** Moves on to the next or previous section or chapter, and tells whether there was one. */
  movePast: (direction: TextDirection) => boolean;
};

/**
 * Lets the keyboard move the lookup cursor through the text, which is one focusable region without an element per word.
 * When the region gains focus from the keyboard, the cursor is placed as the reader's state says, and the arrow keys step it,
 * as `stepReaderCursor` describes; a step past the end of the chapter or section moves on to the next one.
 * Each placement waits in the reader's state until the word is laid out and in view, bringing it into view with a jump when it is not,
 * and then points at the word as the mouse would, with the word's place in the window measured, so that the pop-up can stand beside it.
 * Focus leaving the region takes the cursor away. In the scrolling layout, the text gets focus back when the cursor goes,
 * so that the arrow keys scroll it again.
 * Returns the props for the region, and what to announce to screen readers: in a script written without spaces, the character
 * the cursor looks up from, which the highlight alone does not tell.
 */
export function useReaderKeyboardCursor(props: KeyboardCursorProps) {
  const { container, cursor, pending, isPaged, isDisabled } = props;
  const latest = useRef(props);
  latest.current = props;
  // A press focuses the region with the pointer, which places no cursor of the keyboard's.
  const isPressing = useRef(false);
  const latestStep = useRef(0);
  const hasKeyboardCursor = cursor?.input === "keyboard";
  const lookUpAt: MatchedLengthAtLocation = (location) => {
    const { text, gestures } = latest.current;
    const word = readerWordAt(
      text.paragraphs[location.paragraphIndex] ?? "",
      location,
      text.language,
      text.storedWords?.[location.paragraphIndex],
    );
    return word ? (gestures.lookUpMatchedLength?.(word) ?? null) : null;
  };
  const stepCursor: CursorStepper = (step) => {
    const { cursor, text } = latest.current;
    if (latest.current.isDisabled || cursor?.input !== "keyboard") return;
    const stepNumber = ++latestStep.current;
    const from = cursor.location;
    continueWith(stepReaderCursor(text, cursor, step, lookUpAt), (landing) => {
      const now = latest.current;
      const isCurrent =
        stepNumber === latestStep.current &&
        isSameLocation(now.cursor?.location, from);
      if (!isCurrent) return;
      if (landing !== null || now.movePast(step.direction))
        now.dispatch(actions.readerCursorStepped(landing, step.direction));
    });
  };
  useImperativeHandle(props.stepper, () => stepCursor);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the placement is tried again whenever the text in view moves.
  useEffect(() => {
    if (pending === null || isDisabled) return;
    let isCurrent = true;
    const now = latest.current;
    continueWith(landingOf(pending, now, lookUpAt), (landing) => {
      if (isCurrent && landing !== null) placeAt(latest.current, landing);
    });
    return () => {
      isCurrent = false;
    };
  }, [
    pending,
    isDisabled,
    props.text,
    props.location,
    props.spokenSpan,
    props.layoutVersion,
  ]);

  const hadKeyboardCursor = useRef(false);
  useEffect(() => {
    const element = container.current;
    const isLeaving = hadKeyboardCursor.current && !hasKeyboardCursor;
    hadKeyboardCursor.current = hasKeyboardCursor;
    if (!isLeaving || isPaged || document.activeElement !== element) return;
    element
      ?.querySelector<HTMLElement>(`[${readerViewportAttribute}]`)
      ?.focus({ preventScroll: true });
  }, [container, hasKeyboardCursor, isPaged]);

  return {
    textProps: {
      tabIndex: 0,
      onPointerDownCapture: () => {
        isPressing.current = true;
      },
      // The press has given focus by the time it lifts, so a later focus is the keyboard's again.
      onPointerUpCapture: () => {
        isPressing.current = false;
      },
      onPointerCancelCapture: () => {
        isPressing.current = false;
      },
      onFocus: (event: FocusEvent<HTMLElement>) => {
        const isFromPointer = isPressing.current;
        isPressing.current = false;
        if (event.target !== event.currentTarget || isFromPointer) return;
        if (!latest.current.isDisabled)
          latest.current.dispatch(actions.readerTextFocused());
      },
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null))
          return;
        const { cursor, pending, gestures } = latest.current;
        if (cursor?.input === "keyboard" || pending !== null)
          gestures.onWordPointed?.(null, "keyboard");
      },
    },
    announcement:
      hasKeyboardCursor && cursor.isUnspaced
        ? `Looks up from ${cursor.term.slice(0, runLookupEnd(cursor.term, 0))}`
        : "",
  };
}

/** Where a waiting placement puts the cursor, found in the text, as `PendingReaderCursor` describes each kind. */
function landingOf(
  pending: PendingReaderCursor,
  props: KeyboardCursorProps,
  lookUpAt: MatchedLengthAtLocation,
): CursorLanding {
  const { text, location, spokenSpan } = props;
  switch (pending.kind) {
    case "pageStart":
      return firstWordFrom(text, location);
    case "pageEnd":
      return lastWordIn(text, lookUpAt);
    case "spoken":
      return firstWordFrom(
        text,
        spokenSpan?.chapter_index === text.chapterIndex
          ? {
              chapterIndex: spokenSpan.chapter_index,
              paragraphIndex: spokenSpan.paragraph_index,
              offset: spokenSpan.start,
            }
          : location,
      );
    case "at":
      return pending.location;
  }
}

/**
 * Points at the word at the landing from the keyboard, once it is laid out and in view;
 * a word out of view is jumped to first, and pointed at once the jump has brought it into view.
 */
function placeAt(props: KeyboardCursorProps, landing: ReaderLocation) {
  const { container, text, gestures } = props;
  const element = container.current;
  const paragraph = element?.querySelector(
    `[data-chapter="${landing.chapterIndex}"] [${paragraphAttribute}="${landing.paragraphIndex}"]`,
  );
  if (!element || !paragraph) return;
  const word = readerWordAt(
    text.paragraphs[landing.paragraphIndex] ?? "",
    landing,
    text.language,
    text.storedWords?.[landing.paragraphIndex],
  );
  const range = word && anchorRangeOf(paragraph, word);
  if (!word || !range) return;
  if (!isRangeInView(element, range)) {
    if (!isSameLocation(landing, props.location)) props.jumpTo(landing);
    return;
  }
  const pointed = { ...word, rect: range.getBoundingClientRect() };
  gestures.onWordPointed?.(pointed, "keyboard");
  gestures.onWordHover(pointed);
}

function isSameLocation(
  first: ReaderLocation | undefined,
  second: ReaderLocation,
): boolean {
  return (
    first?.chapterIndex === second.chapterIndex &&
    first.paragraphIndex === second.paragraphIndex &&
    first.offset === second.offset
  );
}
