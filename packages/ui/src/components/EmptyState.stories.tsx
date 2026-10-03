import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderOpen } from "lucide-react";
import { Button } from "./Button.tsx";
import { EmptyState } from "./EmptyState.tsx";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  args: {
    icon: <FolderOpen className="size-8" />,
    title: "No projects yet",
    description:
      "A project collects the media you learn from and the flashcards you make from it.",
    actions: <Button variant="primary">Create a project</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithActions: Story = {};

export const TitleOnly: Story = {
  args: { icon: undefined, description: undefined, actions: undefined },
};
