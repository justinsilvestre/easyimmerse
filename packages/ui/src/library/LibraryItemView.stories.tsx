import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleProjects } from "../projects/exampleProjects.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { exampleLibraryItem } from "./exampleLibrary.ts";
import { LibraryItemView } from "./LibraryItemView.tsx";

const meta = {
  title: "Library/LibraryItemView",
  component: LibraryItemView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    item: exampleLibraryItem(),
    coverUrl: null,
    projects: exampleProjects.slice(0, 1),
    canManage: false,
    isAdding: false,
    addFailure: null,
    onAdd: fn(),
    onEdit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof LibraryItemView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAProject: Story = {};

export const WithoutProjectsInItsLanguage: Story = { args: { projects: [] } };

export const Adding: Story = { args: { isAdding: true } };

export const CouldNotAdd: Story = {
  args: { addFailure: "Could not add the item to the project." },
};

export const Manager: Story = { args: { canManage: true } };
