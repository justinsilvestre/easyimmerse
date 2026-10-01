import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TokenizedText } from "./TokenizedText.tsx";

const meta = {
  title: "Components/TokenizedText",
  component: TokenizedText,
  args: {
    text: "The dog wants to eat.\nIt is hungry!",
    onWordHovered: fn(),
    onWordActivated: fn(),
  },
} satisfies Meta<typeof TokenizedText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sentence: Story = {};

export const WithQuotesAndDashes: Story = {
  args: { text: "“Everything” is quiet — isn’t it?" },
};

export const LargeText: Story = {
  args: { className: "text-3xl" },
};
