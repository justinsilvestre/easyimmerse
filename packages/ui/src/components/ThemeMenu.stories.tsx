import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { ThemeMenu } from "./ThemeMenu.tsx";

const meta = {
  title: "Components/ThemeMenu",
  component: ThemeMenu,
  decorators: [withAppStore],
} satisfies Meta<typeof ThemeMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FollowingSystem: Story = {};

export const DarkChosen: Story = {
  decorators: [withDispatchedActions(actions.preferenceSet("theme", "dark"))],
};
