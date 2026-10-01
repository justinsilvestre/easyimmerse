import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CheckboxField } from "./CheckboxField.tsx";

const meta = {
  title: "Components/CheckboxField",
  component: CheckboxField,
  args: {
    label: "Tag cards with the media file name",
    checked: false,
    onChange: fn(),
  },
} satisfies Meta<typeof CheckboxField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { checked: true } };

export const WithHint: Story = {
  args: {
    label: "Sentence translation",
    hint: "In your language",
    checked: true,
  },
};
