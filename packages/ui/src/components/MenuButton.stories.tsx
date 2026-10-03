import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pencil, Trash2 } from "lucide-react";
import { fn } from "storybook/test";
import { MenuButton } from "./MenuButton.tsx";

const meta = {
  title: "Components/MenuButton",
  component: MenuButton,
  decorators: [
    (Story) => (
      <div className="flex h-40 w-64 justify-end">
        <Story />
      </div>
    ),
  ],
  args: {
    label: "Actions",
    items: [
      { label: "Rename", icon: <Pencil className="size-4" />, onSelect: fn() },
      {
        label: "Delete",
        icon: <Trash2 className="size-4" />,
        isDestructive: true,
        onSelect: fn(),
      },
    ],
  },
} satisfies Meta<typeof MenuButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const WithText: Story = {
  args: { label: "Add a field", children: "Add a field" },
};
