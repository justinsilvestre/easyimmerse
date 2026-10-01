import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LanguageSelect } from "./LanguageSelect.tsx";

const meta = {
  title: "Components/LanguageSelect",
  component: LanguageSelect,
  args: { label: "Target language", value: "", onChange: fn() },
} satisfies Meta<typeof LanguageSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unset: Story = {};

export const ListedLanguage: Story = { args: { value: "de" } };

export const OtherLanguage: Story = { args: { value: "gsw" } };
