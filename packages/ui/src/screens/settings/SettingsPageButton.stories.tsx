import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleQuestionMark, UserRound } from "lucide-react";
import { fn } from "storybook/test";
import { SettingsPageButton } from "./SettingsPageButton.tsx";

const meta = {
  title: "Screens/Settings/SettingsPageButton",
  component: SettingsPageButton,
} satisfies Meta<typeof SettingsPageButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Links to another settings page. */
export const SettingsPage: Story = {
  args: {
    icon: <UserRound className="size-4 text-fg-muted" aria-hidden />,
    label: "Account",
    description:
      "The account you are logged in to, and the devices it is used on.",
    href: "/?settings=general,account",
  },
};

/** Opens a page outside the app. */
export const External: Story = {
  args: {
    icon: <CircleQuestionMark className="size-4 text-fg-muted" aria-hidden />,
    label: "Help",
    description: "Opens the easyImmerse project page in your browser.",
    onClick: fn(),
  },
};
