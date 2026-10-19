import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LeechNotice } from "./LeechNotice.tsx";

const meta = {
  title: "Review/LeechNotice",
  component: LeechNotice,
  args: { lapseCount: 8, onEdit: fn(), onSuspend: fn() },
} satisfies Meta<typeof LeechNotice>;

export default meta;
type Story = StoryObj<typeof LeechNotice>;

export const Leech: Story = {};

/** The card's media file is gone from the project, so it cannot be edited from the review. */
export const WithoutEdit: Story = {
  args: { onEdit: null },
};
