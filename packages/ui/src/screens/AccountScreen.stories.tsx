import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { AccountScreen } from "./AccountScreen.tsx";

const meta = {
  title: "Screens/AccountScreen",
  component: AccountScreen,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: { onBack: fn() },
} satisfies Meta<typeof AccountScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Offline, the page is the form for logging in, headed "Log in". */
export const LoggingIn: Story = {};

/** Set to sign up, the form's page is headed "Sign up". */
export const SigningUp: Story = {
  decorators: [
    withDispatchedActions(actions.signInFormChanged({ mode: "signup" })),
  ],
};
