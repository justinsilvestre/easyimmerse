import { ffmpegNotices } from "@easyimmerse/licenses";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LicensesPage } from "./LicensesPage.tsx";

const meta = {
  title: "Components/LicensesPage",
  component: LicensesPage,
  args: { notices: { status: "loaded", groups: [] } },
  decorators: [
    (Story) => (
      <div className="w-[36rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LicensesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Loading: Story = {
  args: { notices: { status: "loading" } },
};

export const Failed: Story = {
  args: { notices: { status: "failed" } },
};

/** The FFmpeg notices, and a long group like the hundreds of Rust crates that ship. */
export const WithNotices: Story = {
  args: {
    notices: {
      status: "loaded",
      groups: [
        { title: "FFmpeg", notices: ffmpegNotices },
        {
          title: "Rust crates",
          notices: Array.from({ length: 300 }, (_, index) => ({
            title: `crate-${index} 1.0.${index}`,
            text: "License: MIT OR Apache-2.0\nUsed in: server\n\nLICENSE-MIT\n\nPermission is hereby granted…",
          })),
        },
      ],
    },
  },
};
