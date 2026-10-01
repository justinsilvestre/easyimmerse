import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConversionNotice } from "./ConversionNotice.tsx";

const meta = {
  title: "Components/ConversionNotice",
  component: ConversionNotice,
  args: { onPlay: fn(), onCancel: fn() },
} satisfies Meta<typeof ConversionNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OverPlayer: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="aspect-video w-full max-w-4xl bg-linear-to-br from-slate-600 via-slate-800 to-slate-900" />
        <Story />
      </div>
    ),
  ],
};
