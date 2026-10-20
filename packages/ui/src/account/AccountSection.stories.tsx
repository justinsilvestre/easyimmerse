import { actions } from "@easyimmerse/state";
import type { CurrentPrincipal } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { AccountSection } from "./AccountSection.tsx";

const ownServer = "https://books.example.org";

const filledIn = actions.signInFormChanged({
  ownServerUrl: ownServer,
  email: "someone@example.com",
  password: "correct horse",
});

const answered = (accounts: boolean, openSignup: boolean) =>
  actions.serverAuthInfoReceived(ownServer, {
    accounts,
    open_signup: openSignup,
  });

/** A connected server that answers who the app's token belongs to. */
const connectedAs = (principal: CurrentPrincipal) => ({
  appStore: {
    server: { serverUrl: ownServer, token: "session-token" },
    client: createFakeBackendClient({
      ...fixtureResponses,
      "GET /auth/me": principal,
    }),
  },
});

const meta = {
  title: "Account/AccountSection",
  component: AccountSection,
  decorators: [withAppStore],
} satisfies Meta<typeof AccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OfflineOwnServerOnly: Story = {};

export const OfflineWithOfficialServer: Story = {
  parameters: { appStore: { cloudUrl: "https://cloud.example.com" } },
};

export const CheckingServer: Story = {
  decorators: [withDispatchedActions(filledIn, actions.signInSubmitted())],
};

export const ServerWithoutAccounts: Story = {
  decorators: [
    withDispatchedActions(
      filledIn,
      actions.signInSubmitted(),
      answered(false, false),
    ),
  ],
};

export const SignUpClosed: Story = {
  decorators: [
    withDispatchedActions(
      filledIn,
      actions.signInFormChanged({ mode: "signup" }),
      actions.signInSubmitted(),
      answered(true, false),
    ),
  ],
};

export const Submitting: Story = {
  decorators: [
    withDispatchedActions(
      filledIn,
      actions.signInSubmitted(),
      answered(true, true),
    ),
  ],
};

export const WrongPassword: Story = {
  decorators: [
    withDispatchedActions(
      filledIn,
      actions.signInSubmitted(),
      answered(true, true),
      actions.signInFailed({
        status: 401,
        code: "invalid_credentials",
        message: "The email or password is wrong.",
      }),
    ),
  ],
};

export const ServerUnreachable: Story = {
  decorators: [
    withDispatchedActions(
      filledIn,
      actions.signInSubmitted(),
      actions.signInFailed({ status: "NETWORK", message: "Failed to fetch" }),
    ),
  ],
};

export const LoggedIn: Story = {
  parameters: connectedAs({
    kind: "account",
    user: {
      id: "u1",
      email: "someone@example.com",
      role: "privileged",
      created_at_ms: 0,
    },
  }),
};

export const LaunchPrincipal: Story = {
  parameters: connectedAs({ kind: "launch" }),
};
