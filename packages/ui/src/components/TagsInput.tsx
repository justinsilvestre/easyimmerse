import { useId, useState } from "react";
import { FieldHint } from "./FieldHint.tsx";
import { FieldLabel } from "./FieldLabel.tsx";

/** Edits a list of tags. A tag is added on Enter, on a comma, or when the input loses focus. */
export function TagsInput({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: readonly string[];
  onChange: (tags: string[]) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const addTags = (texts: readonly string[]) => {
    const merged = mergeTags(tags, texts);
    if (merged.length > tags.length) onChange(merged);
  };
  const changeDraft = (text: string) => {
    const parts = text.split(",");
    setDraft(parts.pop() ?? "");
    if (parts.length > 0) addTags(parts);
  };
  const commitDraft = () => {
    addTags([draft]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
        {tags.length > 0 && (
          <ul aria-label={label} className="contents">
            {tags.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                onRemove={() => onChange(tags.filter((t) => t !== tag))}
              />
            ))}
          </ul>
        )}
        <input
          id={id}
          type="text"
          value={draft}
          aria-describedby={`${id}-hint`}
          onChange={(event) => changeDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitDraft();
          }}
          onBlur={commitDraft}
          className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm text-gray-900 focus:outline-hidden"
        />
      </div>
      <FieldHint id={`${id}-hint`}>
        Press Enter or type a comma to add a tag.
      </FieldHint>
    </div>
  );
}

function TagChip({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-0.5 rounded-full bg-gray-100 py-0.5 pr-1 pl-2.5 text-sm text-gray-800">
      {tag}
      <button
        type="button"
        aria-label={`Remove ${tag}`}
        onClick={onRemove}
        className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5">
          <path
            d="M4.5 4.5l7 7m0-7l-7 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  );
}

function mergeTags(
  tags: readonly string[],
  texts: readonly string[],
): string[] {
  const trimmed = texts.map((text) => text.trim()).filter(Boolean);
  return [...new Set([...tags, ...trimmed])];
}
