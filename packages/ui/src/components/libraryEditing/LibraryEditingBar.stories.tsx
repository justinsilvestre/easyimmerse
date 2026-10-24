import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LibraryEditingBar } from "./LibraryEditingBar.tsx";

const meta = {
  title: "Components/Library Editing/LibraryEditingBar",
  component: LibraryEditingBar,
  args: { kind: "subtitles", onOpenDetails: fn() },
} satisfies Meta<typeof LibraryEditingBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InThePlayer: Story = {};

export const InTheReader: Story = { args: { kind: "text" } };
