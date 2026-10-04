import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SegmentedControl } from "./SegmentedControl.tsx";

const meta = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  args: {
    label: "Flashcard preset",
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
    value: "beginner",
    onChange: fn(),
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
