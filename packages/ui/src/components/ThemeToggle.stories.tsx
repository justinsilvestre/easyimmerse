import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

const meta = {
  title: "Components/ThemeToggle",
  component: ThemeToggle,
  decorators: [withAppStore],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FollowingSystem: Story = {};

export const OverridingSystem: Story = {
  decorators: [withDispatchedActions(actions.themeToggled())],
};
