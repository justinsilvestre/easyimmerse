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
    languageForm: "closed",
    items: exampleManagedLibraryItems,
    coverUrlOf: () => null,
    addStatus: "ready",
    onSetLanguage: fn(),
    onChangeLanguage: fn(),
    onAddMedia: fn(),
    onEditItem: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof LibraryManagementView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryStatus: Story = {};

/** A library with its language set and no items yet, whose language can still change. */
export const Empty: Story = { args: { items: [] } };

/** A new library, whose manager first chooses its language. */
export const WithoutLanguage: Story = { args: { language: null, items: [] } };

/** The language of an empty library being changed. */
export const ChangingLanguage: Story = {
  args: { items: [], languageForm: "open" },
};

/** The language chosen for a new library being saved. */
export const SettingLanguage: Story = {
  args: { language: null, items: [], languageForm: "saving" },
};

/** A picked file being uploaded, before the new item opens in the player or the reader. */
export const Adding: Story = { args: { addStatus: "adding" } };

export const Loading: Story = { args: { status: "loading", items: [] } };

export const CouldNotLoad: Story = { args: { status: "failed", items: [] } };
