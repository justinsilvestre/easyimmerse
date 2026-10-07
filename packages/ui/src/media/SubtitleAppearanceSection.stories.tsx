import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { SubtitleAppearanceSection } from "./SubtitleAppearanceSection.tsx";

const meta = {
  title: "Media/SubtitleAppearanceSection",
  component: SubtitleAppearanceSection,
  decorators: [withAppStore],
} satisfies Meta<typeof SubtitleAppearanceSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The section as Settings shows it; a change is kept in the story's store, as in the app. */
export const Defaults: Story = {};
