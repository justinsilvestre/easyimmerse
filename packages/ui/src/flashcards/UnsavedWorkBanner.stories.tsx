import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { UnsavedWorkBanner } from "./UnsavedWorkBanner.tsx";

const meta = {
  title: "Flashcards/UnsavedWorkBanner",
  component: UnsavedWorkBanner,
  args: {
    hasUnsavedChanges: true,
    isBackedUp: true,
    onSave: fn(),
    onLogIn: fn(),
  },
} satisfies Meta<typeof UnsavedWorkBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unsaved: Story = {};

export const NotBackedUp: Story = {
  args: { hasUnsavedChanges: false, isBackedUp: false },
};

export const UnsavedAndNotBackedUp: Story = {
  args: { isBackedUp: false },
};
