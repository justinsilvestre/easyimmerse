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
    items: exampleLibraryItems,
    languages: ["de", "ja"],
    tags: ["conversation", "everyday", "news", "stories"],
    filter: { language: null, tags: [] },
    canManage: false,
    coverUrlOf: () => null,
    onChooseLanguage: fn(),
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
    filter: { language: "de", tags: ["news"] },
  },
};

export const NothingMatches: Story = {
  args: { items: [], filter: { language: "ja", tags: ["news"] } },
};

export const Empty: Story = { args: { items: [], languages: [], tags: [] } };

export const Manager: Story = {
  args: { items: exampleManagedLibraryItems, canManage: true },
};

export const Loading: Story = { args: { status: "loading", items: [] } };

export const CouldNotLoad: Story = { args: { status: "failed", items: [] } };
