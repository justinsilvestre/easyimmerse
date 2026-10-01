import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  fixtureDocument,
  fixtureLongDocument,
} from "../testSupport/fixtureDocument.ts";
import { DocumentReader } from "./DocumentReader.tsx";

const meta = {
  title: "Reader/DocumentReader",
  component: DocumentReader,
  parameters: { layout: "fullscreen" },
  args: {
    document: fixtureDocument,
    position: { chapterIndex: 0, paragraphIndex: 0 },
    onPositionChanged: fn(),
    onWordHovered: fn(),
    onWordActivated: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocumentReader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SampleBook: Story = {};

export const LongBook: Story = {
  args: {
    document: fixtureLongDocument,
    position: { chapterIndex: 1, paragraphIndex: 6 },
  },
};

export const SerifLarge: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Serif" }));
    await userEvent.click(canvas.getByRole("button", { name: "Large" }));
  },
};

export const TableOfContentsOpen: Story = {
  args: { document: fixtureLongDocument },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Contents" }));
  },
};

export const SearchResults: Story = {
  args: { document: fixtureLongDocument },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("searchbox"), "bread{Enter}{Enter}");
  },
};
