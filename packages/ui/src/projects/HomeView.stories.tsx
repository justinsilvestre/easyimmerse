import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { exampleProjects } from "./exampleProjects.ts";
import { HomeView } from "./HomeView.tsx";

const meta = {
  title: "Screens/HomeView",
  component: HomeView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    projects: exampleProjects,
    onOpenProject: fn(),
    onCreateProject: fn(),
    onOpenDictionaries: fn(),
    onOpenHelp: fn(),
  },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RecentProjects: Story = {};

export const Empty: Story = { args: { projects: [] } };
