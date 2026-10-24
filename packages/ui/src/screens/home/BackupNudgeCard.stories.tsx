import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { BackupNudgeCard } from "./BackupNudgeCard.tsx";

const meta = {
  title: "Screens/Home/BackupNudgeCard",
  component: BackupNudgeCard,
  decorators: [withAppStore],
  args: {
    place: { kind: "thisDevice", device: "computer" },
    sign: { kind: "deviceOnly", platform: "desktop", hasOfficialServer: true },
    onDismiss: fn(),
  },
} satisfies Meta<typeof BackupNudgeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnAComputer: Story = {};

export const InABrowser: Story = {
  args: {
    place: { kind: "thisDevice", device: "browser" },
    sign: { kind: "browserOnly" },
  },
};
