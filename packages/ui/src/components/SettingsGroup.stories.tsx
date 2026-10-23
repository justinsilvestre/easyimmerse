import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleQuestionMark } from "lucide-react";
import { fn } from "storybook/test";
import { SettingsGroup } from "./SettingsGroup.tsx";
import { SettingsPageButton } from "./SettingsPageButton.tsx";

const meta = {
  title: "Components/SettingsGroup",
  component: SettingsGroup,
  args: {
    title: "About",
    children: (
      <SettingsPageButton
        icon={
          <CircleQuestionMark className="size-4 text-fg-muted" aria-hidden />
        }
        label="Help"
        description="Opens the easyImmerse project page in your browser."
        isExternal
        onClick={fn()}
      />
    ),
  },
} satisfies Meta<typeof SettingsGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOneRow: Story = {};
