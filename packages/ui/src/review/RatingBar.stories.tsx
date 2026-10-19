import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { INITIAL_VIEWPORTS } from "storybook/viewport";
import { RatingBar } from "./RatingBar.tsx";

const meta = {
  title: "Review/RatingBar",
  component: RatingBar,
  parameters: { layout: "fullscreen" },
  args: {
    stage: "front",
    buttons: "two",
    intervals: {
      again: "10 min",
      hard: "2 weeks",
      good: "1 month",
      easy: "3 months",
    },
    onShowAnswer: fn(),
    onRate: fn(),
  },
} satisfies Meta<typeof RatingBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Front: Story = {};

export const TwoButtons: Story = {
  args: { stage: "back" },
};

export const FourButtons: Story = {
  args: { stage: "back", buttons: "four" },
};

export const FourButtonsOnASmallPhone: Story = {
  parameters: { viewport: { options: INITIAL_VIEWPORTS } },
  globals: { viewport: { value: "iphonex", isRotated: false } },
  args: { stage: "back", buttons: "four" },
};
