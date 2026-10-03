import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CheckboxField } from "./CheckboxField.tsx";

const meta = {
  title: "Components/CheckboxField",
  component: CheckboxField,
  args: { label: "Word pronunciation", onChange: fn() },
} satisfies Meta<typeof CheckboxField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const WithHint: Story = {
  args: {
    label: "Fill audio fields with text-to-speech",
    hint: "Used only when the media has no audio track.",
  },
};
