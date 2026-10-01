import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  fixtureDocument,
  fixtureLongDocument,
} from "../testSupport/fixtureDocument.ts";
import { ReaderTableOfContents } from "./ReaderTableOfContents.tsx";

const meta = {
  title: "Reader/ReaderTableOfContents",
  component: ReaderTableOfContents,
  args: {
    chapters: fixtureDocument.chapters,
    currentIndex: 0,
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-96 w-72 border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReaderTableOfContents>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SampleBook: Story = {};

export const WithUntitledChapter: Story = {
  args: { chapters: fixtureLongDocument.chapters, currentIndex: 3 },
};
