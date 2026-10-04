import type { Meta, StoryObj } from "@storybook/react-vite";
import { Kbd } from "./Kbd.tsx";

const meta = {
  title: "Components/Kbd",
  component: Kbd,
  args: { children: "Ctrl+L" },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
