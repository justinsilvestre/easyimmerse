import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { sampleFooterActivities as samples } from "../storybook/sampleFooterActivities.ts";
import { FooterActivityButton } from "./FooterActivityButton.tsx";

const meta = {
  title: "Components/FooterActivities/FooterActivityButton",
  component: FooterActivityButton,
  args: {
    activity: samples.dictionaryImport,
    onOpen: fn(),
  },
} satisfies Meta<typeof FooterActivityButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {};

/** For work that cannot tell how much of it is done, such as an Anki package export. */
export const RunningWithoutPercentage: Story = {
  args: { activity: samples.flashcardExport },
};

/** Flashcard saves that have waited on a slow or unreachable server for more than a couple of seconds. */
export const PendingFlashcardSaves: Story = {
  args: { activity: samples.pendingFlashcardSaves },
};

export const Failed: Story = {
  args: { activity: samples.dictionaryImportFailed },
};

/** A label longer than the room the footer leaves, cut short with an ellipsis while the percentage stays. */
export const Truncated: Story = {
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
  args: { activity: samples.bookAlignment },
};
