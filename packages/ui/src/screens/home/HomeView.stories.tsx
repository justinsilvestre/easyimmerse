import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { BackupNudgeCard } from "./BackupNudgeCard.tsx";
import { exampleProjects, exampleReviewCounts } from "./exampleProjects.ts";
import { HomeView } from "./HomeView.tsx";

const meta = {
  title: "Screens/Home/HomeView",
  component: HomeView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    status: "ready",
    projects: exampleProjects,
    reviewCounts: exampleReviewCounts,
    canManageLibrary: false,
  },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As a learner sees it: no library section, since the library is reached from a project. */
export const RecentProjects: Story = {};

export const LibraryManager: Story = { args: { canManageLibrary: true } };

export const Empty: Story = { args: { projects: [] } };

export const Loading: Story = { args: { status: "loading", projects: [] } };

export const CouldNotLoad: Story = { args: { status: "failed", projects: [] } };

export const Offline: Story = { args: { status: "offline", projects: [] } };

export const WithBackupSuggestion: Story = {
  args: {
    suggestion: (
      <BackupNudgeCard
        place={{ kind: "thisDevice", device: "computer" }}
        sign={{
          kind: "deviceOnly",
          platform: "desktop",
          hasOfficialServer: true,
        }}
        onDismiss={fn()}
      />
    ),
  },
};
