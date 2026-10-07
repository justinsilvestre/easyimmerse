import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleKanjiResult } from "./exampleJapaneseLookup.ts";
import { KanjiCard } from "./KanjiCard.tsx";

const meta = {
  title: "Lookup/KanjiCard",
  component: KanjiCard,
  decorators: [
    (Story) => (
      <div className="w-[32rem] rounded-lg border border-line bg-surface p-3 text-fg">
        <Story />
      </div>
    ),
  ],
  args: { result: exampleKanjiResult, onWordLookup: fn() },
} satisfies Meta<typeof KanjiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Kanji: Story = {};
