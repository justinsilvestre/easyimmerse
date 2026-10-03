import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { Button } from "./Button.tsx";
import { ScreenLayout } from "./ScreenLayout.tsx";

const meta = {
  title: "Components/ScreenLayout",
  component: ScreenLayout,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    headerActions: <Button variant="subtle">Help</Button>,
    children: <p>The screen's content goes here.</p>,
  },
} satisfies Meta<typeof ScreenLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Narrow: Story = {};

export const Wide: Story = { args: { wide: true } };
