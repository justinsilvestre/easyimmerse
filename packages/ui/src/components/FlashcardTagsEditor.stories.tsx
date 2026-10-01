import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FlashcardTagsEditor } from "./FlashcardTagsEditor.tsx";

const meta = {
  title: "Components/FlashcardTagsEditor",
  component: FlashcardTagsEditor,
  args: { tags: ["dark-s01e01", "noun"], onChange: fn() },
} satisfies Meta<typeof FlashcardTagsEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTags: Story = {};

export const Empty: Story = { args: { tags: [] } };
