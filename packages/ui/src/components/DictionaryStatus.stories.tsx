import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DictionaryStatus } from "./DictionaryStatus.tsx";

const meta = {
  title: "Components/DictionaryStatus",
  component: DictionaryStatus,
  parameters: { layout: "padded" },
  args: {
    status: "ready",
    targetLanguage: "de",
    onSetUpDictionaries: fn(),
  },
} satisfies Meta<typeof DictionaryStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Missing: Story = { args: { status: "missing" } };
