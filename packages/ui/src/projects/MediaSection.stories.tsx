import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MediaSection } from "./MediaSection.tsx";

const meta = {
  title: "Projects/MediaSection",
  component: MediaSection,
  decorators: [
    (Story) => (
      <div className="max-w-2xl bg-canvas p-4 text-fg">
        <Story />
      </div>
    ),
  ],
  args: {
    media: [
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
    importSources: [],
    onAddMedia: fn(),
    onImportMedia: fn(),
    onOpenMedia: fn(),
    onDeleteMedia: fn(),
  },
} satisfies Meta<typeof MediaSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithMedia: Story = {};

export const WithImportSources: Story = {
  args: {
    importSources: [
      { name: "downloader", label: "Add from a video site" },
      { name: "podcast-feed", label: "Add from a podcast" },
    ],
  },
};

export const Empty: Story = {
  args: { media: [] },
};

export const EmptyWithAnImportSource: Story = {
  args: {
    media: [],
    importSources: [{ name: "downloader", label: "Add from a video site" }],
  },
};
