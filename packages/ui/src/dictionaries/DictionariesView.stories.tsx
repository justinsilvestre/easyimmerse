import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { DictionariesView } from "./DictionariesView.tsx";
import { exampleDictionaries } from "./exampleDictionaries.ts";

const meta = {
  title: "Screens/DictionariesView",
  component: DictionariesView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    dictionaries: exampleDictionaries,
    unsupportedFile: null,
    onBack: fn(),
    onAddFromRegistry: fn(),
    onAddFromFile: fn(),
    onToggle: fn(),
    onMove: fn(),
    onRemove: fn(),
    onDismissUnsupportedFile: fn(),
  },
} satisfies Meta<typeof DictionariesView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralDictionaries: Story = {};

export const Empty: Story = { args: { dictionaries: [] } };

export const UnsupportedFile: Story = {
  args: { unsupportedFile: "duden.lsd" },
};
