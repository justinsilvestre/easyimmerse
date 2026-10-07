import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { AnchoredPopup } from "./AnchoredPopup.tsx";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import { exampleResults } from "./exampleLookup.ts";
import { resolveExampleMediaUrl } from "./exampleMedia.ts";
import type { PopupSize } from "./popupSize.ts";

/**
 * A word at a place on the page, given as CSS offsets, with the pop-up standing at it.
 * The bar along the pop-up's bottom switches its size, and so does Escape while it is expanded.
 */
function PopupAtWord({
  wordAt,
  initialSize,
}: {
  wordAt: { top: string; left: string } | null;
  initialSize: PopupSize;
}) {
  const [word, setWord] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState(initialSize);
  return (
    <div className="relative h-dvh">
      {wordAt && (
        <span
          ref={setWord}
          style={wordAt}
          className="absolute rounded-sm bg-accent-soft px-1"
        >
          fressen
        </span>
      )}
      <AnchoredPopup anchor={word} size={size}>
        <DictionaryPopup
          state={{ kind: "found", term: "fressen", results: exampleResults }}
          mode={wordAt ? "word" : "search"}
          size={size}
          resolveMediaUrl={resolveExampleMediaUrl}
          onSearch={fn()}
          onCreateFlashcard={fn()}
          onToggleSize={() =>
            setSize(size === "compact" ? "expanded" : "compact")
          }
          wordActions={{ onFlashcard: fn() }}
          onClose={fn()}
          onSetUpDictionary={fn()}
        />
      </AnchoredPopup>
    </div>
  );
}

const followedWords = [
  { text: "der", top: "78%", left: "15%" },
  { text: "Hund", top: "82%", left: "45%" },
  { text: "fressen", top: "70%", left: "75%" },
  { text: "Katze", top: "12%", left: "30%" },
  { text: "schlafen", top: "20%", left: "65%" },
];

/** Several words, with the pop-up moving to the one the mouse rests on, as it follows words in subtitles. */
function PopupFollowingWords() {
  const [word, setWord] = useState<HTMLElement | null>(null);
  return (
    <div className="relative h-dvh">
      {followedWords.map(({ text, top, left }) => (
        <span
          key={text}
          style={{ top, left }}
          onPointerEnter={(event) => setWord(event.currentTarget)}
          className="absolute rounded-sm bg-accent-soft px-1"
        >
          {text}
        </span>
      ))}
      {word && (
        <AnchoredPopup anchor={word}>
          <DictionaryPopup
            state={{ kind: "found", term: "fressen", results: exampleResults }}
            mode="word"
            resolveMediaUrl={resolveExampleMediaUrl}
            onSearch={fn()}
            onCreateFlashcard={fn()}
            onClose={() => setWord(null)}
            onSetUpDictionary={fn()}
          />
        </AnchoredPopup>
      )}
    </div>
  );
}

const meta = {
  title: "Lookup/AnchoredPopup",
  component: PopupAtWord,
  parameters: { layout: "fullscreen" },
  args: { wordAt: { top: "80%", left: "33%" }, initialSize: "compact" },
} satisfies Meta<typeof PopupAtWord>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At a word low on the screen, as in the subtitles over a video. */
export const AboveWord: Story = {};

/** At a word high on the screen, as at the top of the subtitles panel. */
export const BelowWord: Story = {
  args: { wordAt: { top: "10%", left: "33%" } },
};

/** At a word by the window's left edge, shifted right to stay inside the window. */
export const AtLeftEdge: Story = {
  args: { wordAt: { top: "50%", left: "4px" } },
};

/** At a word by the window's right edge, as in the subtitles panel, shifted left to stay inside the window. */
export const AtRightEdge: Story = {
  args: { wordAt: { top: "30%", left: "calc(100% - 4rem)" } },
};

/** Enlarged to show more of the entries, spanning the window's height over the word. */
export const Expanded: Story = { args: { initialSize: "expanded" } };

/** Enlarged at a word in the window's top right corner, shifted left and covering the word. */
export const ExpandedAtTopRight: Story = {
  args: {
    wordAt: { top: "8px", left: "calc(100% - 4rem)" },
    initialSize: "expanded",
  },
};

/** Opened on its search field, with no word to stand at. */
export const WithoutWord: Story = { args: { wordAt: null } };

/** Following the mouse from word to word: it glides between words on the same side and changes sides at once. */
export const FollowingWords: Story = {
  render: () => <PopupFollowingWords />,
};
