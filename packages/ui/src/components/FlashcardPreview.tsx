import { flashcardFieldOrder } from "@easyimmerse/state";
import type { FlashcardFieldKind, FlashcardSettings } from "@easyimmerse/types";
import type { ReactNode } from "react";
import { flashcardFieldLabels } from "../flashcardFieldLabels.ts";
import { findLanguageName } from "./languageOptions.ts";

const exampleMediaNameTag = "Episode_1";

const exampleFieldContents: Record<FlashcardFieldKind, ReactNode> = {
  word: <span className="text-2xl font-semibold text-fg">cat</span>,
  word_pronunciation: <span className="text-fg-muted">/kæt/</span>,
  l1_definition: "Katze",
  l2_definition: "a small furry animal kept as a pet",
  context: (
    <span>
      The <strong className="font-semibold">cat</strong> is sleeping.
    </span>
  ),
  context_translation: (
    <span className="text-fg-muted">Die Katze schläft.</span>
  ),
  context_pronunciation: (
    <span className="text-fg-muted">/ðə kæt ɪz ˈsliːpɪŋ/</span>
  ),
  context_audio: <AudioPlaceholder />,
  screenshot: <ScreenshotPlaceholder />,
};

/** An example flashcard showing the fields and tags that new cards will get with the given settings. */
export function FlashcardPreview({
  settings,
  targetLanguage,
  translationLanguage,
}: {
  settings: FlashcardSettings;
  targetLanguage: string;
  translationLanguage: string;
}) {
  const fields = flashcardFieldOrder.filter((kind) =>
    settings.included_fields.includes(kind),
  );
  return (
    <div className="flex flex-col gap-3">
      <article
        aria-label="Example flashcard"
        className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 shadow-sm"
      >
        {fields.length === 0 ? (
          <p className="text-sm text-fg-muted">
            No fields are selected, so new cards would be empty.
          </p>
        ) : (
          <dl className="flex flex-col gap-4">
            {fields.map((kind) => (
              <PreviewField key={kind} caption={flashcardFieldLabels[kind]}>
                {exampleFieldContents[kind]}
              </PreviewField>
            ))}
          </dl>
        )}
        <PreviewTags tags={listTags(settings)} />
      </article>
      <p className="text-xs text-fg-muted">
        {describeLanguages(targetLanguage, translationLanguage)}
      </p>
    </div>
  );
}

function PreviewField({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-fg-muted">{caption}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

function PreviewTags({ tags }: { tags: readonly string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
      <span className="mr-1 text-xs text-fg-muted">Tags</span>
      {tags.length === 0 ? (
        <span className="text-xs text-fg-muted">None</span>
      ) : (
        tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-fg-soft"
          >
            {tag}
          </span>
        ))
      )}
    </div>
  );
}

function describeLanguages(
  targetLanguage: string,
  translationLanguage: string,
): string {
  if (targetLanguage === "" || translationLanguage === "") {
    return "Example content.";
  }
  return `Example content. Your cards will be in ${findLanguageName(targetLanguage)}, with translations in ${findLanguageName(translationLanguage)}.`;
}

function listTags(settings: FlashcardSettings): string[] {
  const mediaNameTags = settings.tag_with_media_name
    ? [exampleMediaNameTag]
    : [];
  return [...new Set([...settings.default_tags, ...mediaNameTags])];
}

function AudioPlaceholder() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-full bg-accent text-on-accent">
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3">
          <path d="M5 3.5v9l7-4.5z" fill="currentColor" />
        </svg>
      </span>
      <span className="h-1 flex-1 rounded-full bg-surface-strong" />
      <span className="text-xs text-fg-muted">0:02</span>
    </span>
  );
}

function ScreenshotPlaceholder() {
  return (
    <span className="flex aspect-video w-full items-center justify-center rounded-lg bg-surface-muted text-fg-faint">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8">
        <path
          d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
