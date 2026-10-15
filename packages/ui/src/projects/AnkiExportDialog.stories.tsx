import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { AnkiExportDialog } from "./AnkiExportDialog.tsx";

const meta = {
  title: "Projects/AnkiExportDialog",
  component: AnkiExportDialog,
  parameters: { layout: "fullscreen" },
  decorators: [withAppStore],
  args: {
    mediaFiles: [
      {
        id: "m1",
        name: "Dark S01E01 - Geheimnisse.mkv",
        kind: "video",
        flashcardCount: 37,
      },
      {
        id: "m2",
        name: "Die Verwandlung (Hörbuch).mp3",
        kind: "audio",
        flashcardCount: 4,
      },
    ],
    chosenMediaFileIds: null,
    scope: "newAndChanged",
    newAndChangedCount: 12,
    allCount: 41,
    isBusy: false,
    onScopeChange: fn(),
    onMediaToggle: fn(),
    onExport: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof AnkiExportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewCards: Story = {};

export const AllCards: Story = {
  args: { scope: "all" },
};

export const OneMediaFile: Story = {
  args: { chosenMediaFileIds: ["m1"], newAndChangedCount: 12, allCount: 37 },
};

export const NothingToExport: Story = {
  args: { chosenMediaFileIds: ["m2"], newAndChangedCount: 0, allCount: 4 },
};

export const Exporting: Story = {
  args: { isBusy: true },
};
