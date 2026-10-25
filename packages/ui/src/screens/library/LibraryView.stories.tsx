import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import {
  exampleLibraryItems,
  exampleManagedLibraryItems,
} from "../../testSupport/exampleLibrary.ts";
import { LibraryView } from "./LibraryView.tsx";

const meta = {
  title: "Screens/Library/LibraryView",
  component: LibraryView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    status: "ready",
    language: "de",
    items: exampleLibraryItems,
    tags: ["conversation", "everyday", "news", "stories"],
    filter: { tags: [] },
    canManage: false,
    coverUrlOf: () => null,
    onToggleTag: fn(),
    onOpenItem: fn(),
    onManage: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof LibraryView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Browsing: Story = {};

export const Filtered: Story = {
  args: {
    items: exampleLibraryItems.slice(1, 2),
    filter: { tags: ["news"] },
  },
};

export const NothingMatches: Story = {
  args: { items: [], filter: { tags: ["news", "stories"] } },
};

export const Empty: Story = { args: { items: [], tags: [] } };

/** A library whose manager has not yet set its language. */
export const WithoutLanguage: Story = {
  args: { language: null, items: [], tags: [] },
};

export const Manager: Story = {
  args: { items: exampleManagedLibraryItems, canManage: true },
};

export const Loading: Story = { args: { status: "loading", items: [] } };

export const CouldNotLoad: Story = { args: { status: "failed", items: [] } };
