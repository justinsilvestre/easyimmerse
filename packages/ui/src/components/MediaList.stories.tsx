import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
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

/** Reached by clicking a file's remove control. */
export const ConfirmingRemoval: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Remove Dark S01E01 – Geheimnisse.mkv",
      }),
    );
  },
};
