import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NewLibraryMediaForm } from "./NewLibraryMediaForm.tsx";

const meta = {
  title: "Screens/Library Manage/NewLibraryMediaForm",
  component: NewLibraryMediaForm,
  args: { status: "ready", languageChoice: null, onAddMedia: fn() },
} satisfies Meta<typeof NewLibraryMediaForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

/** A library with no items yet, whose language is chosen along with the first media. */
export const ChoosingLanguage: Story = { args: { languageChoice: "de" } };

/** The picked file being uploaded, before the new item opens in the player or the reader. */
export const Adding: Story = { args: { status: "adding" } };

/** The projects still loading, which tell where the new item opens. */
export const Waiting: Story = { args: { status: "waiting" } };
