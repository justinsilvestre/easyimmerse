import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.tsx";

const meta = {
  component: Button,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Button>;

export default meta;

export const Default: StoryObj<typeof meta> = {
  args: { children: "Create new project" },
};
