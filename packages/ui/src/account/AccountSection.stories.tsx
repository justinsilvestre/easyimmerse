import type { NativePlatform } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type { CurrentPrincipal } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { AccountSection } from "./AccountSection.tsx";

const ownServer = "https://books.example.org";

const filledIn = actions.signInFormChanged({
  ownServerUrl: ownServer,
  email: "someone@example.com",
  password: "correct horse",
});

/** Fills in the signup form for the own server with the given password. */
const signingUpWith = (password: string) =>
  actions.signInFormChanged({
    mode: "signup",
    ownServerUrl: ownServer,
    email: "someone@example.com",
    password,
  });

const answered = (accounts: boolean, openSignup: boolean) =>
  actions.serverAuthInfoReceived(ownServer, {
    accounts,
    open_signup: openSignup,
  });

/** A connected server that answers who the app's token belongs to as given, and never answers a log-out. */
const connectedAs = (principal: FakeResponse, bundledIn?: NativePlatform) => ({
  appStore: {
    server: { serverUrl: ownServer, token: "session-token", bundledIn },
    client: createFakeBackendClient({
      ...fixtureResponses,
      "GET /auth/me": principal,
      "POST /auth/logout": () => new Promise(() => undefined),
    }),
  },
});

const someone: CurrentPrincipal = {
  kind: "account",
  user: {
    id: "u1",
    email: "someone@example.com",
    role: "privileged",
    created_at_ms: 0,
  },
};

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

export const SignUpWithShortPassword: Story = {
  decorators: [withDispatchedActions(signingUpWith("tulip7"))],
};

export const SignUpWithWeakPassword: Story = {
  decorators: [withDispatchedActions(signingUpWith("marigold"))],
};

export const SignUpWithFairPassword: Story = {
  decorators: [withDispatchedActions(signingUpWith("Tr0ub4dor&3"))],
};

export const SignUpWithStrongPassword: Story = {
  decorators: [
    withDispatchedActions(signingUpWith("correct horse battery staple")),
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

export const TooManyAttempts: Story = {
  decorators: [
    withDispatchedActions(
      filledIn,
      actions.signInSubmitted(),
      answered(true, true),
      actions.signInFailed({
        status: 429,
        code: "too_many_attempts",
        message: "Too many attempts.",
        retryAfterSeconds: 240,
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

export const CheckingAccount: Story = {
  parameters: connectedAs(() => new Promise(() => undefined)),
};

export const LoggedIn: Story = {
  parameters: connectedAs(someone),
};

export const LoggingOut: Story = {
  parameters: connectedAs(someone),
  decorators: [withDispatchedActions(actions.signOutRequested())],
};

export const SignInNoLongerAccepted: Story = {
  parameters: connectedAs(
    fakeFailure({
      status: 401,
      code: "unauthorized",
      message: "The token is not valid.",
    }),
  ),
};

/** A build set up with its server's own token, as a self-hoster's may be. */
export const LaunchPrincipal: Story = {
  parameters: connectedAs({ kind: "launch" }),
};

export const DesktopApp: Story = {
  parameters: connectedAs({ kind: "launch" }, "desktop"),
};

export const MobileApp: Story = {
  parameters: connectedAs({ kind: "launch" }, "mobile"),
};
