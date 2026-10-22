import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SegmentedControl } from "./SegmentedControl.tsx";

const meta = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  // Padded rather than centred, so that on a phone the control has the screen's width to fill, as it does in a form.
  parameters: { layout: "padded" },
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

/** More options than fit one row on a phone, where they wrap into a grid of separate buttons. */
export const ManyOptions: Story = {
  args: {
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
      { value: "custom", label: "Custom" },
    ],
  },
};

/** Inside a column that stretches its children, as in a form, where the row keeps to the width of its options. */
export const InAColumn: Story = {
  decorators: [
    (Story) => (
      <div className="flex max-w-lg flex-col gap-3">
        <Story />
      </div>
    ),
  ],
};
