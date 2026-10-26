import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { exampleManagedLibraryItems } from "../../testSupport/exampleLibrary.ts";
import { LibraryManagementView } from "./LibraryManagementView.tsx";

const meta = {
  title: "Screens/Library Manage/LibraryManagementView",
  component: LibraryManagementView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    status: "ready",
    language: "de",
    items: exampleManagedLibraryItems,
    coverUrlOf: () => null,
    addStatus: "ready",
    onAddMedia: fn(),
  },
} satisfies Meta<typeof LibraryManagementView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryStatus: Story = {};

/** A library with no items yet, whose language is chosen when media is added. */
export const Empty: Story = { args: { items: [] } };

/** A new library, which has no language until its first media is added. */
export const WithoutLanguage: Story = { args: { language: null, items: [] } };

/** A picked file being uploaded, before the new item opens in the player or the reader. */
export const Adding: Story = { args: { addStatus: "adding" } };

export const Loading: Story = { args: { status: "loading", items: [] } };

export const CouldNotLoad: Story = { args: { status: "failed", items: [] } };
