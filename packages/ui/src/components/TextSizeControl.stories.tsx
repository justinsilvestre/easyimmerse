import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { TextSizeControl } from "./TextSizeControl.tsx";

const meta = {
  title: "Components/TextSizeControl",
  component: TextSizeControl,
  decorators: [withAppStore],
} satisfies Meta<typeof TextSizeControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Large: Story = {
  decorators: [withDispatchedActions(actions.textSizeChosen("large"))],
};
