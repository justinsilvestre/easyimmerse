import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LinkButton } from "./LinkButton.tsx";

const meta = {
  title: "Components/Common/LinkButton",
  component: LinkButton,
  args: { children: "Show the setup steps", onClick: fn() },
} satisfies Meta<typeof LinkButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Alone: Story = {};

export const InASentence: Story = {
  render: (args) => (
    <p className="text-sm text-fg-muted">
      Start Anki with the AnkiConnect add-on installed, then check again.{" "}
      <LinkButton {...args} />
    </p>
  ),
};
