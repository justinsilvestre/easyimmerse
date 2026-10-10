import type {
  EditorAction,
  EditorState,
  FlashcardTextFieldKey,
} from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type { AudioClip } from "@easyimmerse/types";
import clsx from "clsx";
import { Minus, Play, Plus, X } from "lucide-react";
import { type ReactNode, useId } from "react";
import { AutoGrowTextarea } from "../components/AutoGrowTextarea.tsx";
import { FocusExpandingBox } from "../components/FocusExpandingBox.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { selectMediaDurationMs } from "../player/selectMediaDurationMs.ts";
import { ClipEditor } from "./ClipEditor.tsx";
import { moveClipEnd, moveClipStart } from "./clipView.ts";
import {
  type FlashcardLanguages,
  findFlashcardField,
} from "./flashcardFields.ts";
import { formatClipDuration, formatClipTime } from "./formatClipTime.ts";

/** The peaks of a media file's audio, each between 0 and 1, and the file's length. */
export type MediaWaveform = { peaks: readonly number[]; durationMs: number };

type FieldsProps = {
  state: EditorState;
  languages: FlashcardLanguages;
  dispatch: (action: EditorAction) => void;
  /** Whether the fields only show their text, as while the flashcard is being saved. */
  isReadOnly?: boolean;
  /** Whether the word's lookup has yet to answer, which the fields it fills say while they are empty. */
  isAwaitingLookup?: boolean;
};

/** The fields a word's lookup fills, which show that the lookup is on its way. */
const lookupFilledKeys: readonly FlashcardTextFieldKey[] = [
  "word",
  "word_pronunciation",
  "l1_definition",
  "l2_definition",
];

/**
 * The text fields of the editor in two bordered blocks: the word with its pronunciation and definitions,
 * and the sentence with its translation and pronunciation. Each block holds only the included fields.
 */
export function TextFieldBlocks(props: FieldsProps) {
  const isIncluded = (key: FlashcardTextFieldKey) =>
    props.state.includedFields.includes(key);
  const cell = (key: FlashcardTextFieldKey) =>
    isIncluded(key) && <Cell key={key} fieldKey={key} {...props} />;
  const wordKeys: FlashcardTextFieldKey[] = ["word", "word_pronunciation"];
  return (
    <>
      <Block
        label="Word and definition"
        isShown={
          isIncluded("word") ||
          isIncluded("l1_definition") ||
          isIncluded("l2_definition") ||
          isIncluded("word_pronunciation")
        }
      >
        <div
          className={clsx(
            "grid divide-x divide-line",
            wordKeys.every(isIncluded) && "grid-cols-2",
          )}
        >
          {wordKeys.map(cell)}
        </div>
        {cell("l1_definition")}
        {cell("l2_definition")}
      </Block>
      <Block
        label="Sentence"
        isShown={
          isIncluded("text_context") ||
          isIncluded("text_context_translation") ||
          isIncluded("text_context_pronunciation")
        }
      >
        {cell("text_context")}
        {cell("text_context_translation")}
        {cell("text_context_pronunciation")}
      </Block>
    </>
  );
}

function Block({
  label,
  isShown,
  children,
}: {
  label: string;
  isShown: boolean;
  children: ReactNode;
}) {
  if (!isShown) return null;
  return (
    <fieldset
      aria-label={label}
      className="min-w-0 shrink-0 divide-y divide-line overflow-hidden rounded-md border border-line-strong focus-within:border-accent"
    >
      {children}
    </fieldset>
  );
}

/**
 * One field inside a block: its caption above a borderless input that wraps and grows with its text.
 * A long text is cut off, with its bottom edge faded, until the field has focus. A single-line field takes no line breaks.
 */
function Cell({
  fieldKey,
  state,
  languages,
  dispatch,
  isReadOnly = false,
  isAwaitingLookup = false,
}: FieldsProps & { fieldKey: FlashcardTextFieldKey }) {
  const id = useId();
  const field = findFlashcardField(fieldKey);
  const showsLookupWait =
    isAwaitingLookup && lookupFilledKeys.includes(fieldKey);
  return (
    <div className="flex min-w-0 flex-col px-2.5 pt-1 pb-1.5 focus-within:bg-accent-soft">
      <label htmlFor={id} className="text-xs leading-4 text-fg-muted">
        {field.label(languages)}
      </label>
      <FocusExpandingBox>
        <AutoGrowTextarea
          id={id}
          value={state.content[fieldKey]}
          readOnly={isReadOnly}
          placeholder={showsLookupWait ? "Looking up…" : undefined}
          className="block w-full resize-none overflow-hidden bg-transparent text-sm wrap-anywhere text-fg outline-none placeholder:text-fg-faint placeholder:italic"
          onChange={(event) =>
            dispatch({
              type: "textChanged",
              key: fieldKey,
              value: event.target.value,
            })
          }
          onKeyDown={(event) => {
            if (!field.multiline && event.key === "Enter")
              event.preventDefault();
          }}
        />
      </FocusExpandingBox>
    </div>
  );
}

/**
 * The sentence's audio clip with the screenshot thumbnail beside it. Clicking the thumbnail includes or excludes the screenshot.
 * The clip is drawn on its waveform when there is one, and otherwise shown as its start and end times with buttons that move them,
 * as for a file the browser holds, whose waveform cannot be loaded. Either way a button beside it plays the clip.
 * While read-only, the clip's controls are inert and the screenshot checkbox is marked unavailable and ignored.
 */
export function MediaFields({
  state,
  waveform,
  screenshotUrl,
  dispatch,
  isReadOnly = false,
}: {
  state: EditorState;
  waveform: MediaWaveform | null;
  /** The image of the screenshot at its current time, or null when none can be shown. */
  screenshotUrl: string | null;
  dispatch: (action: EditorAction) => void;
  isReadOnly?: boolean;
}) {
  const { content } = state;
  const thumbnailUrl = content.screenshot === null ? null : screenshotUrl;
  const clip = state.includedFields.includes("audio_context")
    ? content.audio_context
    : null;
  if (clip === null && thumbnailUrl === null) return null;
  const changeClip = (next: AudioClip) =>
    dispatch({ type: "clipChanged", clip: next });
  return (
    <div className="flex shrink-0 items-start gap-2">
      {clip !== null && (
        <fieldset
          aria-label="Sentence audio"
          aria-disabled={isReadOnly || undefined}
          inert={isReadOnly}
          className="min-w-0 flex-1"
        >
          {waveform === null ? (
            <ClipTimes clip={clip} onClipChange={changeClip} />
          ) : (
            <ClipEditor
              peaks={waveform.peaks}
              durationMs={waveform.durationMs}
              clip={clip}
              screenshotMs={content.screenshot?.at_ms ?? null}
              onClipChange={changeClip}
              onScreenshotMsChange={(ms) =>
                dispatch({ type: "screenshotMsChanged", ms })
              }
              controls={<ClipPlayback clip={clip} />}
            />
          )}
        </fieldset>
      )}
      {thumbnailUrl !== null && (
        <ScreenshotThumbnail
          url={thumbnailUrl}
          isIncluded={state.includedFields.includes("screenshot")}
          isReadOnly={isReadOnly}
          onToggle={() => dispatch({ type: "screenshotToggled" })}
        />
      )}
    </div>
  );
}

/** How far one press of a button beside an end of the clip moves that end. */
const nudgeMs = 100;

/**
 * The clip's start and end times, each between buttons that move it a tenth of a second earlier or later,
 * with the button that plays the clip beneath them. The end stays within the media once its length is known.
 */
function ClipTimes({
  clip,
  onClipChange,
}: {
  clip: AudioClip;
  onClipChange: (clip: AudioClip) => void;
}) {
  const knownDurationMs = useAppSelector(selectMediaDurationMs);
  const durationMs =
    knownDurationMs > 0 ? knownDurationMs : Number.POSITIVE_INFINITY;
  const change = (next: AudioClip) => {
    if (next.start_ms !== clip.start_ms || next.end_ms !== clip.end_ms)
      onClipChange(next);
  };
  return (
    <div className="flex flex-col items-center gap-1 rounded-md bg-surface-muted p-1 text-xs text-fg-muted tabular-nums">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <ClipBoundary
          label="Clip start"
          ms={clip.start_ms}
          onEarlier={() => change(moveClipStart(clip, clip.start_ms - nudgeMs))}
          onLater={() => change(moveClipStart(clip, clip.start_ms + nudgeMs))}
        />
        <ClipBoundary
          label="Clip end"
          ms={clip.end_ms}
          onEarlier={() =>
            change(moveClipEnd(clip, clip.end_ms - nudgeMs, durationMs))
          }
          onLater={() =>
            change(moveClipEnd(clip, clip.end_ms + nudgeMs, durationMs))
          }
        />
      </div>
      <ClipPlayback clip={clip} />
    </div>
  );
}

/** One end of the clip: its time between the buttons that move it earlier and later. */
function ClipBoundary({
  label,
  ms,
  onEarlier,
  onLater,
}: {
  label: string;
  ms: number;
  onEarlier: () => void;
  onLater: () => void;
}) {
  return (
    <fieldset aria-label={label} className="flex items-center gap-0.5">
      <NudgeButton label={`${label} earlier`} onClick={onEarlier}>
        <Minus className="size-3.5" aria-hidden />
      </NudgeButton>
      <span>{formatClipTime(ms)}</span>
      <NudgeButton label={`${label} later`} onClick={onLater}>
        <Plus className="size-3.5" aria-hidden />
      </NudgeButton>
    </fieldset>
  );
}

function NudgeButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-6 items-center justify-center rounded text-fg-muted pointer-coarse:size-9 hover:bg-surface-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}

/** The button that plays the clip on the media player, with the clip's length beside it. */
function ClipPlayback({ clip }: { clip: AudioClip }) {
  const dispatch = useAppDispatch();
  return (
    <span className="flex items-center gap-1.5">
      {/* Named for the clip, so that screen readers tell it apart from the player's own Play. */}
      <button
        type="button"
        aria-label="Play the clip"
        onClick={() => dispatch(actions.clipPlayRequested(clip))}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-accent-fg pointer-coarse:py-2 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Play className="size-3.5" aria-hidden />
        Play
      </button>
      <span title="Length of the clip">
        {formatClipDuration(clip.end_ms - clip.start_ms)}
      </span>
    </span>
  );
}

function ScreenshotThumbnail({
  url,
  isIncluded,
  isReadOnly,
  onToggle,
}: {
  url: string;
  isIncluded: boolean;
  isReadOnly: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex w-24 shrink-0 cursor-pointer flex-col gap-1 text-xs text-fg-muted">
      <span className="relative">
        <img
          src={url}
          alt="Screenshot from the video"
          className={clsx(
            "w-full rounded-md",
            !isIncluded && "opacity-40 grayscale",
          )}
        />
        {!isIncluded && (
          <X
            className="absolute inset-0 m-auto size-8 text-fg-muted"
            aria-hidden
          />
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <input
          type="checkbox"
          aria-label="Include the screenshot"
          checked={isIncluded}
          // Not `disabled`, which would move keyboard focus away from the checkbox.
          aria-disabled={isReadOnly || undefined}
          readOnly={isReadOnly}
          onChange={isReadOnly ? undefined : onToggle}
          className="size-3.5 accent-accent"
        />
        Screenshot
      </span>
    </label>
  );
}
