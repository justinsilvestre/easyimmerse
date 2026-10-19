import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { sampleFooterActivities as samples } from "../storybook/sampleFooterActivities.ts";
import { FooterActivitiesList } from "./FooterActivitiesList.tsx";

const meta = {
  title: "Components/FooterActivities/FooterActivitiesList",
  component: FooterActivitiesList,
  args: {
    "aria-label": "Tasks",
    activities: [
      samples.dictionaryImport,
      samples.mediaFetch,
      samples.flashcardExport,
    ],
    onOpen: fn(),
  },
} satisfies Meta<typeof FooterActivitiesList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllRunning: Story = {};

export const WithAFailure: Story = {
  args: {
    activities: [
      samples.dictionaryImportFailed,
      samples.mediaFetch,
      samples.subtitleGeneration,
    ],
  },
};

/** Every kind of activity at once, with a label too long for the row. */
export const Crowded: Story = {
  args: {
    activities: [
      samples.dictionaryImport,
      samples.mediaFetchFailed,
      samples.flashcardExport,
      samples.bookAlignment,
      samples.subtitleGeneration,
      samples.pendingFlashcardSaves,
    ],
  },
};
