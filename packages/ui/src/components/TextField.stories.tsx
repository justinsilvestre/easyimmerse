import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TextField } from "./TextField.tsx";

const meta = {
  title: "Components/TextField",
  component: TextField,
  args: {
    label: "Project name",
    placeholder: "Dark, season one",
    onChange: fn(),
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { defaultValue: "Midnight Diner" } };

export const WithHint: Story = {
  args: { hint: "Shown in the project list and used as the Anki deck name." },
};

export const Multiline: Story = {
  args: {
    label: "Definition",
    multiline: true,
    defaultValue: "to eat (of animals); to devour",
  },
};
