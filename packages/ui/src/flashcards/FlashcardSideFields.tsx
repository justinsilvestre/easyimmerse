import type { FlashcardContent, FlashcardFieldKey } from "@easyimmerse/types";
import clsx from "clsx";
import { Play, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../components/Badge.tsx";
import { splitIntoWords } from "../components/ClickableText.tsx";
import { DefinitionMarkdown } from "./DefinitionMarkdown.tsx";
import {
  type FlashcardLanguages,
  findFlashcardField,
} from "./flashcardFields.ts";

/** How large a card draws its fields: small in a thumbnail, as in the preview, or large on the review screen. */
export type FlashcardFieldSize = "compact" | "regular" | "large";

/** What every field of a card needs to draw itself. */
export type FlashcardFieldContext = {
  content: FlashcardContent;
  languages: FlashcardLanguages;
  side: "front" | "back";
  size: FlashcardFieldSize;
  screenshotUrl: string | null;
  onPlayAudio: (() => void) | undefined;
  /** Shows the screenshot at full size when it is tapped. Without it, the screenshot is only an image. */
  onExpandScreenshot?: () => void;
};

/** The fields drawn together in one block under the sentence, set off by a coloured edge. */
const sentenceNoteFields: readonly FlashcardFieldKey[] = [
  "text_context_translation",
  "text_context_pronunciation",
];

const wordSizes: Record<FlashcardFieldSize, string> = {
  compact: "text-sm",
  regular: "text-2xl",
  large: "text-2xl leading-tight tracking-tight sm:text-3xl",
};

const screenshotSizes: Record<FlashcardFieldSize, string> = {
  compact: "max-h-16",
  regular: "max-h-40",
  large: "max-h-40 rounded-lg",
};

/* On the review screen the sentence's translation is set off by a quiet edge, so that it reads as a note beside the sentence rather than as part of it. */
const sentenceNoteEdges: Record<FlashcardFieldSize, string> = {
  compact: "border-accent",
  regular: "border-accent",
  large: "border-line-strong text-sm sm:text-base",
};

// The large button keeps to the 44 px that touch guidelines ask for.
const playButtonSizes: Record<FlashcardFieldSize, string> = {
  compact: "size-6",
  regular: "size-8",
  large: "size-11",
};

/** Draws a side's fields in order, with the sentence's translation and pronunciation in one block. */
export function FlashcardSideFields({
  fields,
  context,
}: {
  fields: readonly FlashcardFieldKey[];
  context: FlashcardFieldContext;
}) {
  const notes = fields.filter((key) => sentenceNoteFields.includes(key));
  return fields.map((key) => {
    if (!notes.includes(key)) {
      return <Field key={key} fieldKey={key} context={context} />;
    }
    if (key !== notes[0]) return null;
    return (
      <div
        key="sentence-notes"
        className={clsx(
          "flex flex-col gap-0.5 border-l-2 pl-3 text-fg-muted",
          sentenceNoteEdges[context.size],
          context.side === "front" && "self-stretch text-left",
        )}
      >
        {notes.map((note) => (
          <Field key={note} fieldKey={note} context={context} />
        ))}
      </div>
    );
  });
}

function Field({
  fieldKey,
  context,
}: {
  fieldKey: FlashcardFieldKey;
  context: FlashcardFieldContext;
}) {
  const { content, languages, side, size } = context;
  const compact = size === "compact";
  const label = findFlashcardField(fieldKey).label(languages);
  switch (fieldKey) {
    case "word":
      return (
        <p
          className={clsx(
            "font-semibold",
            side === "front" && wordSizes[size],
            side === "back" && size === "regular" && "text-base",
            side === "back" &&
              size === "large" &&
              "text-xl leading-tight tracking-tight",
          )}
        >
          <ValueOrLabel value={content.word} label={label} />
        </p>
      );
    case "text_context":
      return (
        <p
          className={clsx(
            side === "front" && "mt-1",
            size === "regular" && "text-base",
            size === "large" && "text-base leading-relaxed sm:text-lg",
            size === "large" && side === "front" && "max-w-prose text-balance",
          )}
        >
          <HighlightedWord
            text={content.text_context}
            word={content.word}
            label={label}
          />
        </p>
      );
    case "word_pronunciation":
    case "text_context_pronunciation":
    case "text_context_translation":
      return (
        <p className="text-fg-muted">
          <ValueOrLabel value={content[fieldKey]} label={label} />
        </p>
      );
    case "l1_definition":
    case "l2_definition":
      return (
        <DefinitionField
          markdown={content[fieldKey]}
          label={label}
          className={clsx(
            fieldKey === "l2_definition" && "text-fg-soft",
            size === "large" && "leading-relaxed",
          )}
        />
      );
    case "audio_context":
      return (
        content.audio_context &&
        (context.onPlayAudio ? (
          <PlayButton onPlay={context.onPlayAudio} size={size} />
        ) : (
          <AudioMark compact={compact} />
        ))
      );
    case "screenshot":
      return (
        context.screenshotUrl !== null && (
          <Screenshot
            url={context.screenshotUrl}
            size={size}
            onExpand={context.onExpandScreenshot}
          />
        )
      );
    case "tags":
      return (
        content.tags.length > 0 && (
          <ul aria-label="Tags" className="flex flex-wrap gap-1">
            {content.tags.map((tag) => (
              <li key={tag}>
                <Badge>{tag}</Badge>
              </li>
            ))}
          </ul>
        )
      );
  }
}

function PlayButton({
  onPlay,
  size,
}: {
  onPlay: () => void;
  size: FlashcardFieldSize;
}) {
  return (
    <button
      type="button"
      aria-label="Play the sentence audio"
      onClick={onPlay}
      className={clsx(
        "mt-1 flex items-center justify-center rounded-full border border-line-strong text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        playButtonSizes[size],
      )}
    >
      <Play className={size === "compact" ? "size-3" : "size-4"} aria-hidden />
    </button>
  );
}

/** Marks where the sentence audio plays on the card, when the preview has no way to play it. */
function AudioMark({ compact }: { compact: boolean }) {
  return (
    <span role="img" aria-label="Sentence audio" className="mt-1 text-fg-muted">
      <Volume2 className={compact ? "size-3" : "size-4"} aria-hidden />
    </span>
  );
}

/** Shows a definition's Markdown as Anki renders it, or the field's name as a placeholder when it is empty. */
function DefinitionField({
  markdown,
  label,
  className,
}: {
  markdown: string;
  label: string;
  className?: string;
}) {
  if (!markdown.trim())
    return (
      <p className={className}>
        <ValueOrLabel value="" label={label} />
      </p>
    );
  return <DefinitionMarkdown markdown={markdown} className={className} />;
}

/** Shows the value, or the field's name as a placeholder when it is empty. */
function ValueOrLabel({ value, label }: { value: string; label: string }) {
  const text = value.trim();
  if (text) return <TextWithLineBreaks text={text} />;
  return <span className="text-fg-faint italic">{label}</span>;
}

/** Shows plain text with each of its line breaks kept, as the exported Anki card does. */
function TextWithLineBreaks({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let lineStart = 0;
  for (const line of text.split("\n")) {
    if (lineStart > 0) parts.push(<br key={lineStart} />);
    parts.push(line.replaceAll("\r", ""));
    lineStart += line.length + 1;
  }
  return parts;
}

function HighlightedWord({
  text,
  word,
  label,
}: {
  text: string;
  word: string;
  label: string;
}) {
  if (!text.trim()) return <ValueOrLabel value="" label={label} />;
  return splitIntoWords(text.trim()).map((part) =>
    part.isWord && part.text === word ? (
      <mark
        key={part.start}
        className="rounded bg-accent-soft px-0.5 text-accent-fg"
      >
        {part.text}
      </mark>
    ) : (
      <TextWithLineBreaks key={part.start} text={part.text} />
    ),
  );
}

/** The card's screenshot, which opens at full size when tapped if `onExpand` is given. */
function Screenshot({
  url,
  size,
  onExpand,
}: {
  url: string;
  size: FlashcardFieldSize;
  onExpand: (() => void) | undefined;
}) {
  const image = (
    <img
      src={url}
      alt="Screenshot from the video"
      className={clsx("rounded-md object-cover", screenshotSizes[size])}
    />
  );
  if (onExpand === undefined) return image;
  return (
    <button
      type="button"
      aria-label="Show the screenshot at full size"
      className="cursor-zoom-in rounded-md focus-visible:outline-2 focus-visible:outline-accent"
      onClick={onExpand}
    >
      {image}
    </button>
  );
}
