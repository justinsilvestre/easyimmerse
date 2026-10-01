import type { Meta, StoryObj } from "@storybook/react-vite";
import { MediaKindIcon } from "./MediaKindIcon.tsx";

const meta = {
  title: "Components/MediaKindIcon",
  component: MediaKindIcon,
  args: { kind: "video" },
} satisfies Meta<typeof MediaKindIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Video: Story = {};

export const Audio: Story = { args: { kind: "audio" } };

export const Document: Story = { args: { kind: "document" } };
