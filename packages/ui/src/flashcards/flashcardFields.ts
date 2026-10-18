import type { FlashcardFieldKey } from "@easyimmerse/types";
import { languageName } from "../projects/languages.ts";

/** The project's languages as BCP 47 codes: the one being learned and the one translations are in. */
export type FlashcardLanguages = { target: string; translation: string };

/** Fields are grouped by the language they are in, with the audio, screenshot, and tags apart. */
export type FlashcardFieldGroup = "target" | "translation" | "media";

export type FlashcardFieldDefinition = {
  key: FlashcardFieldKey;
  group: FlashcardFieldGroup;
  multiline: boolean;
  label: (languages: FlashcardLanguages) => string;
};

/** Every field, in the order forms and previews show them. */
export const flashcardFieldDefinitions: readonly FlashcardFieldDefinition[] = [
  {
    key: "word",
    group: "target",
    multiline: false,
    label: ({ target }) => `Word (${target})`,
  },
  {
    key: "word_pronunciation",
    group: "target",
    multiline: false,
    label: () => "Word pronunciation",
  },
  {
    key: "l1_definition",
    group: "translation",
    multiline: true,
    label: ({ translation }) => `Definition (${translation})`,
  },
  {
    key: "l2_definition",
    group: "target",
    multiline: true,
    label: ({ target }) => `Definition (${target})`,
  },
  {
    key: "text_context",
    group: "target",
    multiline: true,
    label: ({ target }) => `Sentence (${target})`,
  },
  {
    key: "text_context_translation",
    group: "translation",
    multiline: true,
    label: ({ translation }) => `Sentence (${translation})`,
  },
  {
    key: "text_context_pronunciation",
    group: "target",
    multiline: true,
    label: () => "Sentence pronunciation",
  },
  {
    key: "audio_context",
    group: "media",
    multiline: false,
    label: () => "Sentence audio",
  },
  {
    key: "screenshot",
    group: "media",
    multiline: false,
    label: () => "Screenshot",
  },
  { key: "tags", group: "media", multiline: false, label: () => "Tags" },
];

export const flashcardFieldGroups: readonly FlashcardFieldGroup[] = [
  "target",
  "translation",
  "media",
];

/** Names a group after its language, for example `German`, or `Media and tags`. */
export function labelOfFieldGroup(
  group: FlashcardFieldGroup,
  languages: FlashcardLanguages,
): string {
  if (group === "media") return "Media and tags";
  return languageName(languages[group]);
}

export function findFlashcardField(
  key: FlashcardFieldKey,
): FlashcardFieldDefinition {
  const field = flashcardFieldDefinitions.find(
    (candidate) => candidate.key === key,
  );
  if (!field) throw new Error(`Unknown flashcard field: ${key}`);
  return field;
}
