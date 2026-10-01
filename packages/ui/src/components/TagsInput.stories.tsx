import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TagsInput } from "./TagsInput.tsx";

const meta = {
  title: "Components/TagsInput",
  component: TagsInput,
  args: { label: "Default tags", tags: [], onChange: fn() },
} satisfies Meta<typeof TagsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithTags: Story = {
  args: { tags: ["dark", "season_1", "german_tv"] },
};

export const ManyTags: Story = {
  args: {
    tags: [
      "dark",
      "season_1",
      "german_tv",
      "mystery",
      "time_travel",
      "winden",
      "netflix",
    ],
  },
};
