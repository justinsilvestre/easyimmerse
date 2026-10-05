import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { AnchoredPopup } from "./AnchoredPopup.tsx";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import { exampleResults } from "./exampleLookup.ts";
import { resolveExampleMediaUrl } from "./exampleMedia.ts";

/** A word at a place on the page, with the pop-up standing at it. */
function PopupAtWord({ wordTop }: { wordTop: string | null }) {
  const [word, setWord] = useState<HTMLElement | null>(null);
  return (
    <div className="relative h-dvh">
      {wordTop && (
        <span
          ref={setWord}
          style={{ top: wordTop }}
          className="absolute left-1/3 rounded-sm bg-accent-soft px-1"
        >
          fressen
        </span>
      )}
      <AnchoredPopup anchor={word}>
        <DictionaryPopup
          state={{ kind: "found", term: "fressen", results: exampleResults }}
          mode={wordTop ? "word" : "search"}
          resolveMediaUrl={resolveExampleMediaUrl}
          onSearch={fn()}
          onCreateFlashcard={fn()}
          onWordFlashcard={fn()}
          onClose={fn()}
          onSetUpDictionary={fn()}
        />
      </AnchoredPopup>
    </div>
  );
}

const meta = {
  title: "Lookup/AnchoredPopup",
  component: PopupAtWord,
  parameters: { layout: "fullscreen" },
  args: { wordTop: "80%" },
} satisfies Meta<typeof PopupAtWord>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At a word low on the screen, as in the subtitles over a video. */
export const AboveWord: Story = {};

/** At a word high on the screen, as at the top of the subtitles panel. */
export const BelowWord: Story = { args: { wordTop: "10%" } };

/** Opened on its search field, with no word to stand at. */
export const WithoutWord: Story = { args: { wordTop: null } };
