import clsx from "clsx";
import { Play } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import { splitIntoWords } from "../components/ClickableText.tsx";
import {
  type FlashcardContent,
  type FlashcardFieldKey,
  type FlashcardLanguages,
  type FlashcardTextFieldKey,
  findFlashcardField,
} from "./flashcardFields.ts";

/**
 * Shows a flashcard as it would look when reviewed: the word and its sentence on the front, the answers on the back.
 * Fields outside `includedFields` are left out.
 */
export function FlashcardPreview({
  content,
  includedFields,
  languages,
  compact = false,
  onPlayAudio,
}: {
  content: FlashcardContent;
  includedFields: readonly FlashcardFieldKey[];
  languages: FlashcardLanguages;
  compact?: boolean;
  onPlayAudio?: () => void;
}) {
  const includes = (key: FlashcardFieldKey) => includedFields.includes(key);
  const textOf = (fieldKey: FlashcardTextFieldKey) => (
    <ValueOrLabel
      value={content[fieldKey]}
      label={findFlashcardField(fieldKey).label(languages)}
    />
  );
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
        {includes("word") && (
          <p
            className={clsx("font-semibold", compact ? "text-sm" : "text-2xl")}
          >
            {textOf("word")}
          </p>
        )}
        {includes("wordPronunciation") && (
          <p className="text-fg-muted">{textOf("wordPronunciation")}</p>
        )}
        {includes("textContext") && (
          <p className={clsx("mt-1", !compact && "text-base")}>
            <HighlightedWord
              text={content.textContext}
              word={content.word}
              label={findFlashcardField("textContext").label(languages)}
            />
          </p>
        )}
        {includes("audioContext") && content.audioContext && (
          <button
            type="button"
            aria-label="Play the sentence audio"
            onClick={onPlayAudio}
            className={clsx(
              "mt-1 flex items-center justify-center rounded-full border border-line-strong text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              compact ? "size-6" : "size-8",
            )}
          >
            <Play className={compact ? "size-3" : "size-4"} aria-hidden />
          </button>
        )}
      </section>
      <section
        className={clsx(
          "flex flex-col border-t border-dashed border-line-strong bg-surface-muted",
          compact ? "gap-1 px-3 py-2" : "gap-2 px-4 py-3",
        )}
      >
        <SideLabel>Back</SideLabel>
        {includes("l1Definition") && <p>{textOf("l1Definition")}</p>}
        {includes("l2Definition") && (
          <p className="text-fg-soft">{textOf("l2Definition")}</p>
        )}
        {(includes("textContextTranslation") ||
          includes("textContextPronunciation")) && (
          <div className="flex flex-col gap-0.5 border-l-2 border-accent pl-3 text-fg-muted">
            {includes("textContextTranslation") && (
              <p>{textOf("textContextTranslation")}</p>
            )}
            {includes("textContextPronunciation") && (
              <p>{textOf("textContextPronunciation")}</p>
            )}
          </div>
        )}
        {includes("screenshot") && content.screenshot && (
          <img
            src={content.screenshot.url}
            alt="Screenshot from the video"
            className={clsx(
              "rounded-md object-cover",
              compact ? "max-h-16" : "max-h-40",
            )}
          />
        )}
        {includes("tags") && content.tags.length > 0 && (
          <ul aria-label="Tags" className="flex flex-wrap gap-1">
            {content.tags.map((tag) => (
              <li key={tag}>
                <Badge>{tag}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
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
