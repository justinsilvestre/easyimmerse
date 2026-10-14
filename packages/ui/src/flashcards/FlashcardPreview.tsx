import type { FlashcardContent, FlashcardFieldKey } from "@easyimmerse/types";
import clsx from "clsx";
import { Play } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { splitIntoWords } from "../components/ClickableText.tsx";
import { cardSidesOf } from "./cardSidesOf.ts";
import {
  type FlashcardLanguages,
  findFlashcardField,
} from "./flashcardFields.ts";

type Side = "front" | "back";

/** What every field of the preview needs to draw itself. */
type FieldContext = {
  content: FlashcardContent;
  languages: FlashcardLanguages;
  side: Side;
  compact: boolean;
  screenshotUrl: string | null;
  onPlayAudio: (() => void) | undefined;
};

/** The fields drawn together in one block under the sentence, set off by a coloured edge. */
const sentenceNoteFields: readonly FlashcardFieldKey[] = [
  "text_context_translation",
  "text_context_pronunciation",
];

/**
 * Shows a flashcard as it would look when reviewed, with the included fields split between the front and the back.
 * The front holds the included `frontFields`; when none of them has a value, it shows the word and the sentence instead.
 * Fields outside `includedFields` are left out.
 */
export function FlashcardPreview({
  content,
  includedFields,
  frontFields,
  languages,
  compact = false,
  screenshotUrl = null,
  onPlayAudio,
}: {
  content: FlashcardContent;
  includedFields: readonly FlashcardFieldKey[];
  frontFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  compact?: boolean;
  /** The image of the card's screenshot. Null when none can be shown. */
  screenshotUrl?: string | null;
  onPlayAudio?: () => void;
}) {
  const sides = cardSidesOf(content, includedFields, frontFields);
  const context = { content, languages, compact, screenshotUrl, onPlayAudio };
  return (
    <article
      aria-label="Flashcard preview"
      className={clsx(
        "flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm",
        compact ? "text-[0.65rem]" : "text-sm",
      )}
    >
      <section
        className={clsx(
          "flex flex-col items-center gap-1 text-center",
          compact ? "px-3 py-2" : "px-4 py-4",
        )}
      >
        <SideLabel>Front</SideLabel>
        <SideFields
          fields={sides.front}
          context={{ ...context, side: "front" }}
        />
      </section>
      <section
        className={clsx(
          "flex flex-col border-t border-dashed border-line-strong bg-surface-muted",
          compact ? "gap-1 px-3 py-2" : "gap-2 px-4 py-3",
        )}
      >
        <SideLabel>Back</SideLabel>
        <SideFields
          fields={sides.back}
          context={{ ...context, side: "back" }}
        />
      </section>
    </article>
  );
}

/** Draws a side's fields in order, with the sentence's translation and pronunciation in one block. */
function SideFields({
  fields,
  context,
}: {
  fields: readonly FlashcardFieldKey[];
  context: FieldContext;
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
          "flex flex-col gap-0.5 border-l-2 border-accent pl-3 text-fg-muted",
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
  context: FieldContext;
}) {
  const { content, languages, side, compact } = context;
  const label = findFlashcardField(fieldKey).label(languages);
  switch (fieldKey) {
    case "word":
      return (
        <p
          className={clsx(
            "font-semibold",
            side === "front" && (compact ? "text-sm" : "text-2xl"),
            side === "back" && !compact && "text-base",
          )}
        >
          <ValueOrLabel value={content.word} label={label} />
        </p>
      );
    case "text_context":
      return (
        <p
          className={clsx(side === "front" && "mt-1", !compact && "text-base")}
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
      return (
        <p>
          <ValueOrLabel value={content.l1_definition} label={label} />
        </p>
      );
    case "l2_definition":
      return (
        <p className="text-fg-soft">
          <ValueOrLabel value={content.l2_definition} label={label} />
        </p>
      );
    case "audio_context":
      return content.audio_context && <PlayButton context={context} />;
    case "screenshot":
      return (
        context.screenshotUrl !== null && (
          <img
            src={context.screenshotUrl}
            alt="Screenshot from the video"
            className={clsx(
              "rounded-md object-cover",
              compact ? "max-h-16" : "max-h-40",
            )}
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

function PlayButton({ context }: { context: FieldContext }) {
  return (
    <button
      type="button"
      aria-label="Play the sentence audio"
      onClick={context.onPlayAudio}
      className={clsx(
        "mt-1 flex items-center justify-center rounded-full border border-line-strong text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        context.compact ? "size-6" : "size-8",
      )}
    >
      <Play className={context.compact ? "size-3" : "size-4"} aria-hidden />
    </button>
  );
}

function SideLabel({ children }: { children: string }) {
  return (
    <span className="self-start text-[0.65rem] font-medium tracking-wider text-fg-faint uppercase">
      {children}
    </span>
  );
}

/** Shows the value, or the field's name as a placeholder when it is empty. */
function ValueOrLabel({ value, label }: { value: string; label: string }) {
  if (value.trim()) return value;
  return <span className="text-fg-faint italic">{label}</span>;
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
  return splitIntoWords(text).map((part) =>
    part.isWord && part.text === word ? (
      <mark
        key={part.start}
        className="rounded bg-accent-soft px-0.5 text-accent-fg"
      >
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}
