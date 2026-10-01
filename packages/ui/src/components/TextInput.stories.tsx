import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TextInput } from "./TextInput.tsx";

const meta = {
  title: "Components/TextInput",
  component: TextInput,
  args: { label: "Project name", value: "", onChange: fn() },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { placeholder: "Dark, season one" } };

export const Filled: Story = { args: { value: "Midnight Diner" } };

export const WithHint: Story = {
  args: {
    label: "Language code",
    value: "gsw",
    hint: "A BCP 47 tag, such as gsw or pt-BR.",
  },
};
