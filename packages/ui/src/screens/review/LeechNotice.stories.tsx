import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LeechNotice } from "./LeechNotice.tsx";

const meta = {
  title: "Screens/Review/LeechNotice",
  component: LeechNotice,
  args: { lapseCount: 8, onSuspend: fn() },
} satisfies Meta<typeof LeechNotice>;

export default meta;
type Story = StoryObj<typeof LeechNotice>;

export const Leech: Story = {};
