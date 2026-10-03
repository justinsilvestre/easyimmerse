import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { TextSizeMenu } from "./TextSizeMenu.tsx";

const meta = {
  title: "Components/TextSizeMenu",
  component: TextSizeMenu,
  decorators: [withAppStore],
} satisfies Meta<typeof TextSizeMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultScale: Story = {};

export const Enlarged: Story = {
  decorators: [withDispatchedActions(actions.textScaleChosen(125))],
};
