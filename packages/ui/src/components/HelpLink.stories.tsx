import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { HelpLink } from "./HelpLink.tsx";

const meta = {
  title: "Components/HelpLink",
  component: HelpLink,
  decorators: [withAppStore],
} satisfies Meta<typeof HelpLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
