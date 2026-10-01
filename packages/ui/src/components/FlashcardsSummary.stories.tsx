import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FlashcardsSummary } from "./FlashcardsSummary.tsx";

const meta = {
  title: "Components/FlashcardsSummary",
  component: FlashcardsSummary,
  parameters: { layout: "padded" },
  args: {
    count: 128,
    onExportAnkiPackage: fn(),
    onSetUpAnkiConnect: fn(),
    onStartReview: fn(),
  },
} satisfies Meta<typeof FlashcardsSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFlashcards: Story = {};

export const NoFlashcards: Story = { args: { count: 0 } };
