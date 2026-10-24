import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { ThemeChoiceControl } from "./ThemeChoiceControl.tsx";

const meta = {
  title: "Components/ThemeChoiceControl",
  component: ThemeChoiceControl,
  decorators: [withAppStore],
} satisfies Meta<typeof ThemeChoiceControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the Profile menu shows it, in its small size. */
export const Small: Story = {};

/** As the Display settings show it. */
export const Medium: Story = { args: { size: "md" } };
