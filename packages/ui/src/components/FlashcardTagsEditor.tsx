import { useId, useState } from "react";

/** Edits a card's tags as removable chips, adding the typed tag on Enter, on a comma, or when the input loses focus. */
export function FlashcardTagsEditor({
  tags,
  onChange,
}: {
  tags: readonly string[];
  onChange: (tags: readonly string[]) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const addDraft = () => {
    const tag = draft.trim();
    setDraft("");
    if (tag !== "" && !tags.includes(tag)) onChange([...tags, tag]);
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        Tags
      </label>
      <div className="flex flex-wrap items-center gap-1 rounded border border-gray-300 p-1 focus-within:border-blue-600">
        {tags.length > 0 && (
          <ul className="contents">
            {tags.map((tag) => (
              <li
                key={tag}
                className="flex items-center gap-1 rounded bg-gray-100 py-0.5 pl-2 text-sm text-gray-700"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  className="rounded px-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                  onClick={() => onChange(tags.filter((kept) => kept !== tag))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id={inputId}
          value={draft}
          placeholder="Add a tag"
          className="min-w-24 flex-1 px-1 py-0.5 text-sm focus:outline-none"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={addDraft}
          onKeyDown={(event) => {
            // An Enter that confirms an input method's composition, as in Japanese typing, does not add a tag.
            if (event.nativeEvent.isComposing) return;
            if (event.key !== "Enter" && event.key !== ",") return;
            event.preventDefault();
            addDraft();
          }}
        />
      </div>
    </div>
  );
}
