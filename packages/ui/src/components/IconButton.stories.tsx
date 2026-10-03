import type { Meta, StoryObj } from "@storybook/react-vite";
import { Settings } from "lucide-react";
import { fn } from "storybook/test";
import { IconButton } from "./IconButton.tsx";

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  args: {
    label: "Settings",
    onClick: fn(),
    children: <Settings className="size-4" />,
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = { args: { active: true } };

export const Disabled: Story = { args: { disabled: true } };
