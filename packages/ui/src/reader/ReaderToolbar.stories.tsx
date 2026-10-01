import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ReaderToolbar } from "./ReaderToolbar.tsx";
import { defaultReaderSettings } from "./readerSettings.ts";

const meta = {
  title: "Reader/ReaderToolbar",
  component: ReaderToolbar,
  parameters: { layout: "fullscreen" },
  args: {
    chapterIndex: 1,
    chapterCount: 5,
    onChapterStepped: fn(),
    isTableOfContentsOpen: false,
    onTableOfContentsToggled: fn(),
    settings: defaultReaderSettings,
    onSettingsChanged: fn(),
    searchQuery: "",
    searchMatchIndex: null,
    searchMatchCount: 0,
    onSearchQueryChanged: fn(),
    onSearchStepped: fn(),
  },
} satisfies Meta<typeof ReaderToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MiddleChapter: Story = {};

export const FirstChapter: Story = { args: { chapterIndex: 0 } };

export const TableOfContentsOpen: Story = {
  args: { isTableOfContentsOpen: true },
};

export const SearchTyped: Story = {
  args: { searchQuery: "bread", searchMatchCount: 12 },
};

export const SearchResultShown: Story = {
  args: { searchQuery: "bread", searchMatchIndex: 2, searchMatchCount: 12 },
};

export const NoSearchResults: Story = {
  args: { searchQuery: "elephant" },
};

export const SerifLarge: Story = {
  args: { settings: { fontFamily: "serif", fontSize: "large" } },
};
