import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AnchoredPopup } from "./AnchoredPopup.tsx";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import { exampleResults } from "./exampleLookup.ts";
import { resolveExampleMediaUrl } from "./exampleMedia.ts";

const meta = {
  title: "Lookup/AnchoredPopup",
  component: AnchoredPopup,
  parameters: { layout: "fullscreen" },
  args: {
    anchor: { top: 520, bottom: 544, left: 300, right: 372 },
    onPointerInsideChange: fn(),
    children: (
      <DictionaryPopup
        state={{ kind: "found", term: "fressen", results: exampleResults }}
        mode="word"
        resolveMediaUrl={resolveExampleMediaUrl}
        onSearch={fn()}
        onCreateFlashcard={fn()}
        onWordFlashcard={fn()}
        onClose={fn()}
        onSetUpDictionary={fn()}
      />
    ),
  },
} satisfies Meta<typeof AnchoredPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At a word low on the screen, as in the subtitles over a video. */
export const AboveWord: Story = {};

/** At a word high on the screen, as at the top of the subtitles panel. */
export const BelowWord: Story = {
  args: { anchor: { top: 80, bottom: 104, left: 40, right: 100 } },
};

/** Opened on its search field, with no word to stand at. */
export const WithoutWord: Story = { args: { anchor: null } };
