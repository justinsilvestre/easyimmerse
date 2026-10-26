import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { ScreenLayout } from "./ScreenLayout.tsx";

const meta = {
  title: "Layout/ScreenLayout",
  component: ScreenLayout,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    children: <p>The screen's content goes here.</p>,
  },
} satisfies Meta<typeof ScreenLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = {};

export const Wide: Story = { args: { wide: true } };

export const DeeperScreen: Story = {
  args: { backHref: "/", backLabel: "Projects" },
};
