/** A time range within a media file's audio track, in milliseconds. */
export type AudioClip = { startMs: number; endMs: number };

/**
 * Everything a flashcard can hold. L1 is the language the user already knows; L2 is the one they are learning.
 * The screenshot is an image URL.
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
  screenshot: string | null;
  tags: string[];
};

export type FlashcardFieldKey = keyof FlashcardContent;

export type FlashcardTextFieldKey = {
  [Key in FlashcardFieldKey]: FlashcardContent[Key] extends string
    ? Key
    : never;
}[FlashcardFieldKey];

export type FlashcardFieldGroup = "word" | "context" | "media";

export type FlashcardFieldDefinition = {
  key: FlashcardFieldKey;
  label: string;
  group: FlashcardFieldGroup;
  multiline: boolean;
};

/** Every field, in the order forms and previews show them. */
export const flashcardFields: readonly FlashcardFieldDefinition[] = [
  { key: "word", label: "Word", group: "word", multiline: false },
  {
    key: "wordPronunciation",
    label: "Word pronunciation",
    group: "word",
    multiline: false,
  },
  {
    key: "l1Definition",
    label: "Definition in your language",
    group: "word",
    multiline: true,
  },
  {
    key: "l2Definition",
    label: "Definition in the target language",
    group: "word",
    multiline: true,
  },
  { key: "textContext", label: "Sentence", group: "context", multiline: true },
  {
    key: "textContextTranslation",
    label: "Sentence translation",
    group: "context",
    multiline: true,
  },
  {
    key: "textContextPronunciation",
    label: "Sentence pronunciation",
    group: "context",
    multiline: true,
  },
  {
    key: "audioContext",
    label: "Sentence audio",
    group: "media",
    multiline: false,
  },
  { key: "screenshot", label: "Screenshot", group: "media", multiline: false },
  { key: "tags", label: "Tags", group: "media", multiline: false },
];

export const flashcardFieldGroupLabels: Record<FlashcardFieldGroup, string> = {
  word: "Word",
  context: "Sentence",
  media: "Media and tags",
};

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
