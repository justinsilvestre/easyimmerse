import clsx from "clsx";
import { Volume2 } from "lucide-react";
import { Badge } from "../components/Badge.tsx";
import {
  type FlashcardContent,
  type FlashcardFieldKey,
  findFlashcardField,
} from "./flashcardFields.ts";
import { formatClipDuration } from "./formatClipDuration.ts";

/**
 * Shows a flashcard as it would look when reviewed, with the word side above the answer side.
 * Fields outside `includedFields` are left out.
 */
export function FlashcardPreview({
  content,
  includedFields,
  compact = false,
}: {
  content: FlashcardContent;
  includedFields: readonly FlashcardFieldKey[];
  compact?: boolean;
}) {
  const has = (key: FlashcardFieldKey) => includedFields.includes(key);
  return (
    <article
      aria-label="Flashcard preview"
      className={clsx(
        "flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm",
        compact ? "text-xs" : "text-sm",
      )}
    >
      <section className="flex flex-col items-center gap-1 px-4 py-5 text-center">
        <SideLabel>Front</SideLabel>
        {has("word") && (
          <p
            className={clsx("font-semibold", compact ? "text-lg" : "text-2xl")}
          >
            <Value value={content.word} fieldKey="word" />
          </p>
        )}
        {has("wordPronunciation") && (
          <p className="text-fg-muted">
            <Value
              value={content.wordPronunciation}
              fieldKey="wordPronunciation"
            />
          </p>
        )}
        {has("audioContext") && content.audioContext && (
          <AudioChip label={formatClipDuration(content.audioContext)} />
        )}
      </section>
      <section className="flex flex-col gap-3 border-t border-dashed border-line-strong bg-surface-muted px-4 py-4">
        <SideLabel>Back</SideLabel>
        {has("l1Definition") && (
          <p>
            <Value value={content.l1Definition} fieldKey="l1Definition" />
          </p>
        )}
        {has("l2Definition") && (
          <p className="text-fg-soft">
            <Value value={content.l2Definition} fieldKey="l2Definition" />
          </p>
        )}
        {(has("textContext") ||
          has("textContextPronunciation") ||
          has("textContextTranslation")) && (
          <div className="flex flex-col gap-0.5 border-l-2 border-accent pl-3">
            {has("textContext") && (
              <p>
                <HighlightedWord
                  text={content.textContext}
                  word={content.word}
                />
              </p>
            )}
            {has("textContextPronunciation") && (
              <p className="text-fg-muted">
                <Value
                  value={content.textContextPronunciation}
                  fieldKey="textContextPronunciation"
                />
              </p>
            )}
            {has("textContextTranslation") && (
              <p className="text-fg-muted">
                <Value
                  value={content.textContextTranslation}
                  fieldKey="textContextTranslation"
                />
              </p>
            )}
          </div>
        )}
        {has("screenshot") && content.screenshot && (
          <img
            src={content.screenshot}
            alt="Screenshot from the video"
            className={clsx(
              "rounded-md object-cover",
              compact ? "max-h-24" : "max-h-40",
            )}
          />
        )}
        {has("tags") && content.tags.length > 0 && (
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
function Value({
  value,
  fieldKey,
}: {
  value: string;
  fieldKey: FlashcardFieldKey;
}) {
  if (value.trim()) return value;
  return (
    <span className="text-fg-faint italic">
      {findFlashcardField(fieldKey).label}
    </span>
  );
}

function HighlightedWord({ text, word }: { text: string; word: string }) {
  if (!text.trim()) return <Value value="" fieldKey="textContext" />;
  if (!word.trim() || !text.includes(word)) return text;
  const [before, ...after] = text.split(word);
  return (
    <>
      {before}
      <mark className="rounded bg-accent-soft px-0.5 text-accent-fg">
        {word}
      </mark>
      {after.join(word)}
    </>
  );
}

function AudioChip({ label }: { label: string }) {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-fg-muted">
      <Volume2 className="size-3" aria-hidden />
      {label}
    </span>
  );
}
