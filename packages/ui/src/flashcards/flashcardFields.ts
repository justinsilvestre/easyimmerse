import { languageName } from "../projects/languages.ts";

/** A time range within a media file's audio track, in milliseconds. */
export type AudioClip = { startMs: number; endMs: number };

/** A still frame of the video, as an image URL, with the time it was taken at. */
export type Screenshot = { url: string; atMs: number };

/**
 * Everything a flashcard can hold. L1 is the language the user already knows; L2 is the one they are learning.
 */
export type FlashcardContent = {
  word: string;
  wordPronunciation: string;
  l1Definition: string;
  l2Definition: string;
  textContext: string;
  textContextTranslation: string;
  textContextPronunciation: string;
  audioContext: AudioClip | null;
  screenshot: Screenshot | null;
  tags: string[];
};

export type FlashcardFieldKey = keyof FlashcardContent;

export type FlashcardTextFieldKey = {
  [Key in FlashcardFieldKey]: FlashcardContent[Key] extends string
    ? Key
    : never;
}[FlashcardFieldKey];

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
export const flashcardFields: readonly FlashcardFieldDefinition[] = [
  { key: "word", group: "target", multiline: false, label: () => "Word" },
  {
    key: "wordPronunciation",
    group: "target",
    multiline: false,
    label: () => "Word pronunciation",
  },
  {
    key: "l1Definition",
    group: "translation",
    multiline: true,
    label: ({ translation }) => `Definition (${translation})`,
  },
  {
    key: "l2Definition",
    group: "target",
    multiline: true,
    label: ({ target }) => `Definition (${target})`,
  },
  {
    key: "textContext",
    group: "target",
    multiline: true,
    label: ({ target }) => `Sentence (${target})`,
  },
  {
    key: "textContextTranslation",
    group: "translation",
    multiline: true,
    label: ({ translation }) => `Sentence (${translation})`,
  },
  {
    key: "textContextPronunciation",
    group: "target",
    multiline: true,
    label: () => "Sentence pronunciation",
  },
  {
    key: "audioContext",
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

/** Whether the field holds text the user can type, rather than audio, an image, or tags. */
export function isTextField(
  key: FlashcardFieldKey,
): key is FlashcardTextFieldKey {
  return key !== "audioContext" && key !== "screenshot" && key !== "tags";
}

export function findFlashcardField(
  key: FlashcardFieldKey,
): FlashcardFieldDefinition {
  const field = flashcardFields.find((candidate) => candidate.key === key);
  if (!field) throw new Error(`Unknown flashcard field: ${key}`);
  return field;
}

/** Adds the field to the selection, or removes it when it is already there. */
export function toggleField(
  fields: readonly FlashcardFieldKey[],
  key: FlashcardFieldKey,
): readonly FlashcardFieldKey[] {
  if (!fields.includes(key)) return [...fields, key];
  return fields.filter((field) => field !== key);
}
