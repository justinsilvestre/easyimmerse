import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { exampleProjects } from "./exampleProjects.ts";
import { HomeView } from "./HomeView.tsx";

const meta = {
  title: "Projects/HomeView",
  component: HomeView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    status: "ready",
    projects: exampleProjects,
    onOpenProject: fn(),
    onCreateProject: fn(),
    onContinueOffline: fn(),
    onOpenDictionaries: fn(),
  },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RecentProjects: Story = {};

export const Empty: Story = { args: { projects: [] } };

export const Loading: Story = { args: { status: "loading", projects: [] } };

export const CouldNotLoad: Story = { args: { status: "failed", projects: [] } };

export const Offline: Story = { args: { status: "offline", projects: [] } };
