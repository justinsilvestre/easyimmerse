import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LibraryLanguageForm } from "./LibraryLanguageForm.tsx";

const meta = {
  title: "Screens/Library Manage/LibraryLanguageForm",
  component: LibraryLanguageForm,
  args: { language: null, isSaving: false, onSetLanguage: fn() },
} satisfies Meta<typeof LibraryLanguageForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new library, which has no language yet. */
export const FirstLanguage: Story = {};

/** The language of an empty library being changed, which cancelling keeps. */
export const Changing: Story = { args: { language: "fr", onCancel: fn() } };

export const Saving: Story = { args: { isSaving: true } };
