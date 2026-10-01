import { actions, type WordHover } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useEffect } from "react";
import { fn } from "storybook/test";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { fixtureJitendexLookupResult } from "../testSupport/fixtureJitendexLookup.ts";
import { fixtureLookupResults } from "../testSupport/fixtureLookup.ts";
import { fixtureStructuredLookupResult } from "../testSupport/fixtureStructuredLookup.ts";
import { DictionaryPopup } from "./DictionaryPopup.tsx";

const hoveredKatze: WordHover = {
  word: "Katze",
  context: "Die Katze schläft auf dem Sofa.",
  clip: { start_ms: 500, end_ms: 1500 },
};

/** Opens the lookup on mount, by hovering the word or, without one, for typing. */
function OpenedDictionaryPopup({
  hover,
  ...props
}: ComponentProps<typeof DictionaryPopup> & { hover: WordHover | null }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(
      hover === null
        ? actions.lookupOpenedForTyping()
        : actions.wordHovered(hover),
    );
  }, [dispatch, hover]);
  return <DictionaryPopup {...props} />;
}

const meta = {
  title: "Components/DictionaryPopup",
  component: OpenedDictionaryPopup,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    hover: hoveredKatze,
    results: fixtureLookupResults,
    status: "idle",
    hasDictionaries: true,
    onCreateFlashcard: fn(),
    onSetUpDictionary: fn(),
  },
} satisfies Meta<typeof OpenedDictionaryPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hovered: Story = {};

export const StructuredContent: Story = {
  args: {
    hover: { word: "猫", context: "猫が寝ている。", clip: null },
    results: [fixtureJitendexLookupResult, fixtureStructuredLookupResult],
  },
};

export const Typed: Story = { args: { hover: null, results: [] } };

export const Loading: Story = { args: { status: "loading", results: [] } };

export const NoEntries: Story = {
  args: {
    results: fixtureLookupResults.map((result) => ({
      ...result,
      entries: [],
    })),
  },
};

export const NoDictionaries: Story = {
  args: { hasDictionaries: false, results: [] },
};

export const ErrorState: Story = {
  name: "Error",
  args: { status: "error", results: [] },
};
