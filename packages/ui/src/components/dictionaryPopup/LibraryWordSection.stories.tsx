import { libraryLookupResponse } from "@easyimmerse/state";
import type { LookupResult } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { resolveExampleMediaUrl } from "./exampleMedia.ts";
import { LibraryWordSection } from "./LibraryWordSection.tsx";

const hund = libraryLookupResponse(
  {
    start: 4,
    end: 8,
    entry: {
      term: "Hund",
      reading: null,
      l1_definition: "dog",
      l2_definition: "ein Haustier",
    },
  },
  "Der Hund schläft.",
  "Im Park",
).results[0] as LookupResult;

const meta = {
  title: "Components/Dictionary Pop-up/LibraryWordSection",
  component: LibraryWordSection,
  args: {
    stored: { text: "Hund", result: hund },
    resolveMediaUrl: resolveExampleMediaUrl,
    onRemove: fn(),
    onApplyEverywhere: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-96 bg-surface p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LibraryWordSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StoredWord: Story = {};

export const NoEntryYet: Story = { args: { stored: null } };
