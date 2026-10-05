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
    mode: "hover",
    resolveMediaUrl: resolveExampleMediaUrl,
    onSearch: fn(),
    onCreateFlashcard: fn(),
    onClose: fn(),
    onSetUpDictionary: fn(),
  },
} satisfies Meta<typeof DictionaryPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EntriesFound: Story = {};

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
