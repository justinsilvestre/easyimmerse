import clsx from "clsx";
import { X } from "lucide-react";
import { type ReactNode, useId } from "react";
import { AutoGrowTextarea } from "../components/AutoGrowTextarea.tsx";
import { ClipEditor } from "./ClipEditor.tsx";
import type { EditorAction, EditorState } from "./editFlashcard.ts";
import {
  type FlashcardLanguages,
  type FlashcardTextFieldKey,
  findFlashcardField,
} from "./flashcardFields.ts";

/** The peaks of a media file's audio, each between 0 and 1, and the file's length. */
export type MediaWaveform = { peaks: readonly number[]; durationMs: number };

type FieldsProps = {
  state: EditorState;
  languages: FlashcardLanguages;
  dispatch: (action: EditorAction) => void;
};

/**
 * The text fields of the editor in two bordered blocks: the word with its pronunciation and definitions,
 * and the sentence with its translation and pronunciation. Each block holds only the included fields.
 */
export function TextFieldBlocks(props: FieldsProps) {
  const isIncluded = (key: FlashcardTextFieldKey) =>
    props.state.includedFields.includes(key);
  const cell = (key: FlashcardTextFieldKey) =>
    isIncluded(key) && <Cell key={key} fieldKey={key} {...props} />;
  const wordKeys: FlashcardTextFieldKey[] = ["word", "wordPronunciation"];
  return (
    <>
      <Block
        label="Word and definition"
        isShown={
          isIncluded("word") ||
          isIncluded("l1Definition") ||
          isIncluded("l2Definition") ||
          isIncluded("wordPronunciation")
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
        {cell("l1Definition")}
        {cell("l2Definition")}
      </Block>
      <Block
        label="Sentence"
        isShown={
          isIncluded("textContext") ||
          isIncluded("textContextTranslation") ||
          isIncluded("textContextPronunciation")
        }
      >
        {cell("textContext")}
        {cell("textContextTranslation")}
        {cell("textContextPronunciation")}
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

/** One field inside a block: its caption above a borderless input that wraps and grows with its text. A single-line field takes no line breaks. */
function Cell({
  fieldKey,
  state,
  languages,
  dispatch,
}: FieldsProps & { fieldKey: FlashcardTextFieldKey }) {
  const id = useId();
  const field = findFlashcardField(fieldKey);
  return (
    <div className="flex min-w-0 flex-col px-2.5 pt-1 pb-1.5 focus-within:bg-accent-soft">
      <label htmlFor={id} className="text-xs leading-4 text-fg-muted">
        {field.label(languages)}
      </label>
      <AutoGrowTextarea
        id={id}
        value={state.content[fieldKey]}
        className="w-full resize-none overflow-hidden bg-transparent text-sm wrap-anywhere text-fg outline-none"
        onChange={(event) =>
          dispatch({
            type: "textChanged",
            key: fieldKey,
            value: event.target.value,
          })
        }
        onKeyDown={(event) => {
          if (!field.multiline && event.key === "Enter") event.preventDefault();
        }}
      />
    </div>
  );
}

/** The clip's waveform with the screenshot thumbnail beside it. Clicking the thumbnail includes or excludes the screenshot. */
export function MediaFields({
  state,
  waveform,
  dispatch,
}: {
  state: EditorState;
  waveform: MediaWaveform | null;
  dispatch: (action: EditorAction) => void;
}) {
  const { content } = state;
  const showsClip =
    state.includedFields.includes("audioContext") &&
    content.audioContext !== null &&
    waveform !== null;
  if (!showsClip && content.screenshot === null) return null;
  return (
    <div className="flex shrink-0 items-start gap-2">
      {showsClip && content.audioContext && waveform && (
        <fieldset aria-label="Sentence audio" className="min-w-0 flex-1">
          <ClipEditor
            peaks={waveform.peaks}
            durationMs={waveform.durationMs}
            clip={content.audioContext}
            screenshotMs={content.screenshot?.atMs ?? null}
            onClipChange={(clip) => dispatch({ type: "clipChanged", clip })}
            onScreenshotMsChange={(ms) =>
              dispatch({ type: "screenshotMsChanged", ms })
            }
          />
        </fieldset>
      )}
      {content.screenshot && (
        <ScreenshotThumbnail
          url={content.screenshot.url}
          isIncluded={state.includedFields.includes("screenshot")}
          onToggle={() => dispatch({ type: "screenshotToggled" })}
        />
      )}
    </div>
  );
}

function ScreenshotThumbnail({
  url,
  isIncluded,
  onToggle,
}: {
  url: string;
  isIncluded: boolean;
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
          onChange={onToggle}
          className="size-3.5 accent-accent"
        />
        Screenshot
      </span>
    </label>
  );
}
