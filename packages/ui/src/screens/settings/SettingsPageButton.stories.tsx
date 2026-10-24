import type { Meta, StoryObj } from "@storybook/react-vite";
import { UserRound } from "lucide-react";
import { fn } from "storybook/test";
import { SettingsPageButton } from "./SettingsPageButton.tsx";

const meta = {
  title: "Screens/Settings/SettingsPageButton",
  component: SettingsPageButton,
  args: {
    icon: <UserRound className="size-4 text-fg-muted" aria-hidden />,
    label: "Account",
    description:
      "The account you are logged in to, and the devices it is used on.",
    onClick: fn(),
  },
} satisfies Meta<typeof SettingsPageButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens another settings page. */
export const SettingsPage: Story = {};

/** Opens a page outside the app. */
export const External: Story = {
  args: {
    label: "Help",
    description: "Opens the easyImmerse project page in your browser.",
    isExternal: true,
  },
};
