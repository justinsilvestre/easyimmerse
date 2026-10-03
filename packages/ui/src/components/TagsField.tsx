import clsx from "clsx";
import { X } from "lucide-react";
import { useId, useState } from "react";
import { addTags, splitTypedTags } from "../flashcards/parseTags.ts";

/**
 * A field that holds a list of tags. A comma or Enter turns the typed text into a tag;
 * Backspace in the empty field takes the last tag back. The label stands above the field, or beside it.
 */
export function TagsField({
  label,
  tags,
  onChange,
  hint,
  isLabelBeside = false,
  className,
}: {
  label: string;
  tags: readonly string[];
  onChange: (tags: readonly string[]) => void;
  hint?: string;
  isLabelBeside?: boolean;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const finish = (typed: string) => {
    const { finished, pending } = splitTypedTags(typed);
    if (finished.length > 0) onChange(addTags(tags, finished));
    setText(pending);
  };
  const finishAll = () => {
    finish(`${text},`);
  };
  return (
    <div
      className={clsx(
        "flex gap-1",
        isLabelBeside ? "items-start" : "flex-col",
        className,
      )}
    >
      <label
        htmlFor={id}
        className={clsx("text-sm font-medium", isLabelBeside && "py-1.5")}
      >
        {label}
      </label>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 rounded-md border border-line-strong bg-surface px-2 py-1 focus-within:border-accent focus-within:outline-2 focus-within:outline-accent/30">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-full bg-surface-muted py-0.5 pr-1 pl-2 text-xs font-medium text-fg-muted"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove the tag ${tag}`}
              onClick={() => onChange(tags.filter((other) => other !== tag))}
              className="rounded-full p-0.5 hover:bg-surface-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          placeholder={tags.length === 0 ? "Add a tag" : undefined}
          onChange={(event) => finish(event.target.value)}
          onBlur={finishAll}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              finishAll();
            } else if (event.key === "Backspace" && text === "") {
              onChange(tags.slice(0, -1));
            }
          }}
          className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-fg outline-none placeholder:text-fg-faint"
        />
      </div>
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}
