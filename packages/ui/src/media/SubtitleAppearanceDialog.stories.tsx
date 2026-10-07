import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SubtitleAppearanceDialog } from "./SubtitleAppearanceDialog.tsx";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";

const meta = {
  title: "Media/SubtitleAppearanceDialog",
  component: SubtitleAppearanceDialog,
  args: {
    appearance: defaultSubtitleAppearance,
    onChange: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof SubtitleAppearanceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Defaults: Story = {};

/** Black text on an opaque white box, with a strong shadow and larger text. */
export const HighContrast: Story = {
  args: {
    appearance: {
      boxColor: "white",
      boxOpacity: 100,
      textShadow: "strong",
      textSizeStep: 4,
      textColor: "black",
    },
  },
};

/** Yellow text with no box at all, as on television. */
export const NoBox: Story = {
  args: {
    appearance: {
      ...defaultSubtitleAppearance,
      boxOpacity: 0,
      textShadow: "strong",
      textColor: "yellow",
    },
  },
};
