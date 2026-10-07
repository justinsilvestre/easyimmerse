import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { AnchoredPopup } from "./AnchoredPopup.tsx";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import { exampleResults } from "./exampleLookup.ts";
import { resolveExampleMediaUrl } from "./exampleMedia.ts";
import type { PopupSize } from "./popupSize.ts";

/** A word at a place on the page, with the pop-up standing at it. The bar along its bottom switches its size. */
function PopupAtWord({
  wordTop,
  initialSize,
}: {
  wordTop: string | null;
  initialSize: PopupSize;
}) {
  const [word, setWord] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState(initialSize);
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
      <AnchoredPopup anchor={word} size={size}>
        <DictionaryPopup
          state={{ kind: "found", term: "fressen", results: exampleResults }}
          mode={wordTop ? "word" : "search"}
          size={size}
          resolveMediaUrl={resolveExampleMediaUrl}
          onSearch={fn()}
          onCreateFlashcard={fn()}
          onToggleSize={() =>
            setSize(size === "compact" ? "expanded" : "compact")
          }
          wordActions={{ onFlashcard: fn(), onLookupStarted: fn() }}
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
  args: { wordTop: "80%", initialSize: "compact" },
} satisfies Meta<typeof PopupAtWord>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At a word low on the screen, as in the subtitles over a video. */
export const AboveWord: Story = {};

/** At a word high on the screen, as at the top of the subtitles panel. */
export const BelowWord: Story = { args: { wordTop: "10%" } };

/** Enlarged to show more of the entries, filling the room on the word's far side. */
export const Expanded: Story = { args: { initialSize: "expanded" } };

/** Opened on its search field, with no word to stand at. */
export const WithoutWord: Story = { args: { wordTop: null } };
