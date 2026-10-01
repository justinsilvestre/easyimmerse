import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "./Button.tsx";

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Save", onClick: fn() },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "subtle", "danger"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };

export const Secondary: Story = { args: { variant: "secondary" } };

export const Subtle: Story = { args: { variant: "subtle" } };

export const Danger: Story = {
  args: { variant: "danger", children: "Remove" },
};

export const Disabled: Story = { args: { variant: "primary", disabled: true } };
