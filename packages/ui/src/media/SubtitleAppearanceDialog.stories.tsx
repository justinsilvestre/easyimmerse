import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { SubtitleAppearanceDialog } from "./SubtitleAppearanceDialog.tsx";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";

const meta = {
  title: "Media/SubtitleAppearanceDialog",
  component: SubtitleAppearanceDialog,
  decorators: [withAppStore],
  args: {
    appearance: defaultSubtitleAppearance,
    onChange: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof SubtitleAppearanceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaults: Story = {};

/** Large text on an opaque background, with the heaviest shadow. */
export const HighContrast: Story = {
  args: {
    appearance: {
      backgroundOpacity: 100,
      textShadow: "heavy",
      textSizeStep: 4,
      textColor: "white",
    },
  },
};

/** Yellow text with no background at all, as on television. */
export const NoBackground: Story = {
  args: {
    appearance: {
      ...defaultSubtitleAppearance,
      backgroundOpacity: 0,
      textShadow: "heavy",
      textColor: "yellow",
    },
  },
};
