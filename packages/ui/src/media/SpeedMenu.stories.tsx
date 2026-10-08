import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SpeedMenu } from "./SpeedMenu.tsx";

const meta = {
  title: "Media/SpeedMenu",
  component: SpeedMenu,
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        className="flex h-72 w-64 items-end justify-end bg-surface p-2"
      >
        <Story />
      </div>
    ),
  ],
  args: { speed: 1, onSpeedChange: fn() },
} satisfies Meta<typeof SpeedMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NormalSpeed: Story = {};

export const SlowedDown: Story = {
  args: { speed: 0.75 },
};
