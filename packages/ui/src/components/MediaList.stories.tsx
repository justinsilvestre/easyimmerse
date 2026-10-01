import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import { MediaList } from "./MediaList.tsx";

const meta = {
  title: "Components/MediaList",
  component: MediaList,
  parameters: { layout: "padded" },
  args: {
    media: fixtureProject.media,
    onOpenMedia: fn(),
    onRemoveMedia: fn(),
  },
} satisfies Meta<typeof MediaList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithItems: Story = {};

export const Empty: Story = { args: { media: [] } };
