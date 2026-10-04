import { ffmpegNotices } from "@easyimmerse/licenses";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LicensesPage } from "./LicensesPage.tsx";

const meta = {
  title: "Components/LicensesPage",
  component: LicensesPage,
  args: { notices: [] },
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

export const WithNotices: Story = {
  args: { notices: ffmpegNotices },
};
