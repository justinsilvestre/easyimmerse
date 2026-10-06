import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ReaderStatus } from "./ReaderStatus.tsx";

const meta = {
  title: "Reader/ReaderStatus",
  component: ReaderStatus,
  parameters: { layout: "fullscreen" },
  args: { title: "die-verwandlung.epub", onBack: fn() },
} satisfies Meta<typeof ReaderStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Opening: Story = {};

export const Failed: Story = {
  args: {
    failure: "The file was not found. It may have been moved or deleted.",
  },
};
