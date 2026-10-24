import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { exampleLibraryItem } from "../../testSupport/exampleLibrary.ts";
import { exampleProjects } from "../home/exampleProjects.ts";
import { LibraryItemView } from "./LibraryItemView.tsx";

const meta = {
  title: "Screens/Library Item/LibraryItemView",
  component: LibraryItemView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    item: exampleLibraryItem(),
    coverUrl: null,
    projects: exampleProjects.slice(0, 1),
    chosenProjectId: exampleProjects[0]?.id ?? null,
    canManage: false,
    isAdding: false,
    addFailure: null,
    onAdd: fn(),
    onChooseProject: fn(),
    onEdit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof LibraryItemView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAProject: Story = {};

export const WithoutProjectsInItsLanguage: Story = {
  args: { projects: [], chosenProjectId: null },
};

export const NewProjectChosen: Story = { args: { chosenProjectId: null } };

export const NotPublished: Story = {
  args: {
    item: exampleLibraryItem({ status: { kind: "draft" } }),
    canManage: true,
  },
};

export const Adding: Story = { args: { isAdding: true } };

export const CouldNotAdd: Story = {
  args: { addFailure: "Could not add the item to the project." },
};

export const Manager: Story = { args: { canManage: true } };
