import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SelectField } from "./SelectField.tsx";

const meta = {
  title: "Components/SelectField",
  component: SelectField,
  args: {
    label: "Target language",
    options: [
      { value: "de", label: "German" },
      { value: "ja", label: "Japanese" },
      { value: "fr", label: "French" },
    ],
    defaultValue: "de",
    onChange: fn(),
  },
} satisfies Meta<typeof SelectField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: "The language you are learning." },
};
