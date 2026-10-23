import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import {
  exampleInflectedResult,
  exampleKanjiResult,
} from "./exampleJapaneseLookup.ts";
import { exampleResults } from "./exampleLookup.ts";
import { resolveExampleMediaUrl } from "./exampleMedia.ts";
import {
  exampleSemanticHtmlResult,
  exampleStyledMDictResult,
  exampleStyledYomitanResult,
  exampleStylesheets,
} from "./exampleStyledLookup.ts";

const meta = {
  title: "Lookup/DictionaryPopup",
  component: DictionaryPopup,
  args: {
    state: { kind: "found", term: "fressen", results: exampleResults },
    mode: "word",
    resolveMedia: resolveExampleMediaUrl,
    onSearch: fn(),
    onCreateFlashcard: fn(),
    onToggleSize: fn(),
    onWordHold: fn(),
    onClose: fn(),
    onSetUpDictionary: fn(),
  },
} satisfies Meta<typeof DictionaryPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EntriesFound: Story = {};

/** Enlarged to show more of the entries, as the bar along its bottom makes it. */
export const Expanded: Story = {
  args: { size: "expanded" },
};

export const JapaneseWithKanji: Story = {
  args: {
    state: {
      kind: "found",
      term: "食べなかった",
      results: [exampleInflectedResult],
      kanji: [exampleKanjiResult],
    },
  },
};

/** Entries from the Yomitan and MDict fixtures and one in semantic HTML, each styled by its own dictionary's stylesheet. */
export const DictionaryStylesheets: Story = {
  args: {
    state: {
      kind: "found",
      term: "本",
      results: [
        exampleStyledYomitanResult,
        exampleStyledMDictResult,
        exampleSemanticHtmlResult,
      ],
      stylesheets: exampleStylesheets,
    },
  },
};

export const Loading: Story = {
  args: { state: { kind: "loading", term: "fressen" } },
};

export const NothingFound: Story = {
  args: { state: { kind: "notFound", term: "Hundi" } },
};

export const MakingFlashcard: Story = {
  args: { pendingFlashcard: "devour" },
};

export const LookupFailed: Story = {
  args: { state: { kind: "failed", term: "fressen" } },
};

export const NoDictionary: Story = {
  args: { state: { kind: "noDictionary", language: "de" } },
};

export const SearchMode: Story = {
  args: { mode: "search", state: null },
};

export const SearchModeWithResults: Story = {
  args: { mode: "search" },
};

/** The sentence row with only a play button, as for a word of a subtitle cue whose translation is already on screen. */
export const SentenceWithAudio: Story = {
  args: {
    sentence: { play: { label: "Replay the cue (R)", onPlay: fn() } },
  },
};

const sentenceTranslation = {
  text: "El perro quiere comer. Tiene hambre.",
  language: "es",
  onToggle: fn(),
};

/** The sentence row with its translation hidden, as it starts, for a word of a book aligned with audio and a translation. */
export const SentenceWithTranslationHidden: Story = {
  args: {
    sentence: {
      play: { label: "Play the sentence (R)", onPlay: fn() },
      translation: { ...sentenceTranslation, isShown: false },
    },
  },
};

/** The sentence row showing the translation, as after a held word or T. */
export const SentenceWithTranslationShown: Story = {
  args: {
    sentence: {
      play: { label: "Play the sentence (R)", onPlay: fn() },
      translation: { ...sentenceTranslation, isShown: true },
    },
  },
};

/** A sentence with a translation but no audio, as in a book aligned with its translation alone. */
export const SentenceWithTranslationOnly: Story = {
  args: {
    sentence: { translation: { ...sentenceTranslation, isShown: true } },
  },
};
