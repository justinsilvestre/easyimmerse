import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge.tsx";

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "German" },
  argTypes: {
    tone: {
      control: "inline-radio",
      options: ["neutral", "accent", "success", "warning", "danger"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Accent: Story = { args: { tone: "accent", children: "Video" } };

export const Success: Story = {
  args: { tone: "success", children: "Connected" },
};

export const Warning: Story = {
  args: { tone: "warning", children: "3 unsent" },
};

export const Danger: Story = {
  args: { tone: "danger", children: "Unreachable" },
};
