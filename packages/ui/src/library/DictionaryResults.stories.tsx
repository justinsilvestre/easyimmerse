import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleResults } from "../components/dictionaryPopup/exampleLookup.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { dictionarySummary } from "../testSupport/renderMediaScreen.tsx";
import { DictionaryResults } from "./DictionaryResults.tsx";

const german = [dictionarySummary("wiktionary-de-en", "de", "en")];

/** A server with the given dictionaries, which answers lookups as given. */
const serverWith = (
  dictionaries: ReturnType<typeof dictionarySummary>[],
  lookup: FakeResponse,
) => ({
  appStore: {
    client: createFakeBackendClient({
      ...fixtureResponses,
      "GET /dictionaries": { dictionaries },
      "GET /dictionaries/lookup": lookup,
    }),
  },
});

const found = { results: [...exampleResults], kanji: [], stylesheets: [] };

const meta = {
  title: "Library/DictionaryResults",
  component: DictionaryResults,
  decorators: [withAppStore],
  parameters: serverWith(german, found),
  args: {
    term: "Hund",
    languages: { target: "de", translation: "en" },
    onUse: fn(),
  },
} satisfies Meta<typeof DictionaryResults>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Results: Story = {};

export const LookingUp: Story = {
  parameters: serverWith(german, () => new Promise(() => undefined)),
};

export const NoEntry: Story = {
  parameters: serverWith(german, { results: [], kanji: [], stylesheets: [] }),
};

export const NoDictionaryForTheLanguage: Story = {
  parameters: serverWith([dictionarySummary("jmdict", "ja", "en")], found),
};

export const LookupFailed: Story = {
  parameters: serverWith(
    german,
    fakeFailure({ status: 500, message: "The dictionaries are unavailable." }),
  ),
};
