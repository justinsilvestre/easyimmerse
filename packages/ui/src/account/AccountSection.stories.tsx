import { actions, selectStatusLineSaves } from "@easyimmerse/state";
import type { CurrentPrincipal, SessionList } from "@easyimmerse/types";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect } from "react";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureResponses,
  fixtureSyncLink,
} from "../testSupport/fixtureResponses.ts";
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
    sends_email: false,
  });

const firefoxOnLinux =
  "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0";

const safariOnIPhone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const dayMs = 24 * 60 * 60 * 1000;

/** The devices the account is logged in on: this one, a laptop used yesterday, and a phone used last week. */
const devices: SessionList = {
  sessions: [
    {
      id: "s1",
      created_at_ms: Date.now() - 3 * dayMs,
      last_used_at_ms: Date.now(),
      user_agent: "",
      is_current: true,
    },
    {
      id: "s2",
      created_at_ms: Date.now() - 40 * dayMs,
      last_used_at_ms: Date.now() - dayMs,
      user_agent: firefoxOnLinux,
      is_current: false,
    },
    {
      id: "s3",
      created_at_ms: Date.now() - 60 * dayMs,
      last_used_at_ms: Date.now() - 7 * dayMs,
      user_agent: safariOnIPhone,
      is_current: false,
    },
  ],
};

/** What a server that sends email offers. */
const mailingServer = { accounts: true, open_signup: true, sends_email: true };

const never = () => new Promise(() => undefined);

/**
 * A connected server that answers who the app's token belongs to as given, lists the account's devices,
 * and never answers a log-out, along with the other answers given.
 */
const connectedAs = (
  principal: FakeResponse,
  answers: Record<string, FakeResponse> = {},
) => ({
  appStore: {
    server: { serverUrl: ownServer, token: "session-token" },
    client: createFakeBackendClient({
      ...fixtureResponses,
      "GET /auth/me": principal,
      "GET /auth/sessions": devices,
      "POST /auth/logout": never,
      ...answers,
    }),
  },
});

const cloudUrl = "https://cloud.example.com";

const resetLinkOpened = actions.mailedLinkOpened({
  kind: "resetPassword",
  token: "t1",
});

const confirmationLinkOpened = actions.mailedLinkOpened({
  kind: "confirmEmail",
  token: "t1",
});

const invalidLink = {
  ok: false,
  error: { status: 400, code: "invalid_link", message: "The link is invalid." },
} as const;

/** The login form for the own server, which the person said they forgot the password of, on a server that does or does not send email. */
const forgotPasswordOn = (sendsEmail: boolean) => [
  filledIn,
  actions.serverAuthInfoReceived(ownServer, {
    accounts: true,
    open_signup: true,
    sends_email: sendsEmail,
  }),
  actions.passwordResetAsked(),
];

const someone: CurrentPrincipal & { kind: "account" } = {
  kind: "account",
  user: {
    id: "u1",
    email: "someone@example.com",
    role: "privileged",
    created_at_ms: 0,
    email_confirmed_at_ms: null,
  },
};

const confirmed: CurrentPrincipal = {
  kind: "account",
  user: { ...someone.user, email_confirmed_at_ms: Date.now() - dayMs },
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
  parameters: connectedAs(never),
};

export const LoggedIn: Story = {
  parameters: connectedAs(someone),
};

export const LoggingOut: Story = {
  parameters: connectedAs(someone),
  decorators: [withDispatchedActions(actions.signOutRequested())],
};

/** Asks to log out once a flashcard save has failed, so that logging out asks to confirm dropping it. */
function LogOutOnceSaveFailed({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const hasFailedSave = useAppSelector(selectStatusLineSaves).length > 0;
  useEffect(() => {
    if (hasFailedSave) dispatch(actions.signOutRequested());
  }, [dispatch, hasFailedSave]);
  return children;
}

const loggingOutWithFailedSave: Decorator = (Story) => (
  <LogOutOnceSaveFailed>
    <Story />
  </LogOutOnceSaveFailed>
);

export const ConfirmingLogOut: Story = {
  parameters: connectedAs(someone, {
    "POST /projects/p1/flashcards": fakeFailure({
      status: 500,
      message: "The server failed.",
    }),
  }),
  decorators: [
    loggingOutWithFailedSave,
    withDispatchedActions(
      actions.openMediaFileRequested("p1", "m1"),
      actions.flashcardStarted(
        {
          id: "story-fressen",
          draft: {
            media_file_id: "m1",
            cue_index: 1,
            word_start: null,
            content: { ...exampleFlashcard, word: "fressen" },
            included_fields: ["word"],
          },
        },
        "save",
      ),
    ),
  ],
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

/** The desktop app, whose built-in server keeps the work on the computer and is not logged in to any server. */
export const DesktopAppNotLinked: Story = {
  parameters: {
    appStore: {
      server: builtInServerOn("desktop"),
      cloudUrl,
      client: createBuiltInServerClient(null),
    },
  },
};

/** The desktop app, whose built-in server keeps a copy of the work on the easyImmerse cloud. */
export const DesktopAppLinked: Story = {
  parameters: {
    appStore: {
      server: builtInServerOn("desktop"),
      cloudUrl,
      client: createBuiltInServerClient({
        ...fixtureSyncLink,
        last_synced_at_ms: Date.now(),
      }),
    },
  },
};

export const LoggedInWithDevices: Story = {
  parameters: connectedAs(someone),
};

export const LoggingOutAnotherDevice: Story = {
  parameters: connectedAs(someone, {
    "DELETE /auth/sessions/s2": never,
  }),
  decorators: [
    withDispatchedActions(actions.deviceLogOutRequested("s2", false)),
  ],
};

export const EmailNotConfirmed: Story = {
  parameters: connectedAs(someone, {
    "GET /auth/server": mailingServer,
  }),
};

export const EmailConfirmed: Story = {
  parameters: connectedAs(confirmed, {
    "GET /auth/server": mailingServer,
  }),
};

export const ConfirmationLinkSent: Story = {
  parameters: connectedAs(someone, {
    "GET /auth/server": mailingServer,
    "POST /auth/confirmation-email": null,
  }),
  decorators: [withDispatchedActions(actions.confirmationEmailRequested())],
};

export const ResendTooSoon: Story = {
  parameters: connectedAs(someone, {
    "GET /auth/server": mailingServer,
    "POST /auth/confirmation-email": fakeFailure({
      status: 429,
      code: "too_many_attempts",
      message: "Too many attempts.",
      retryAfterSeconds: 42,
    }),
  }),
  decorators: [withDispatchedActions(actions.confirmationEmailRequested())],
};

export const ForgotPasswordOnMailServer: Story = {
  decorators: [withDispatchedActions(...forgotPasswordOn(true))],
};

export const ForgotPasswordOnServerWithoutMail: Story = {
  decorators: [withDispatchedActions(...forgotPasswordOn(false))],
};

export const ResetLinkSent: Story = {
  decorators: [
    withDispatchedActions(
      ...forgotPasswordOn(true),
      actions.passwordResetSubmitted(),
      actions.passwordResetAnswered({ ok: true, data: null }),
    ),
  ],
};

export const NewPasswordForm: Story = {
  parameters: { appStore: { cloudUrl } },
  decorators: [
    withDispatchedActions(
      resetLinkOpened,
      actions.mailedLinkFormChanged({ password: "correct horse battery" }),
    ),
  ],
};

/** A reset link opened in a browser that knows of no server, which asks for the address of the one that sent it. */
export const NewPasswordFormWithoutServer: Story = {
  decorators: [withDispatchedActions(resetLinkOpened)],
};

export const NewPasswordLinkInvalid: Story = {
  parameters: { appStore: { cloudUrl } },
  decorators: [
    withDispatchedActions(
      resetLinkOpened,
      actions.mailedLinkFormChanged({ password: "correct horse battery" }),
      actions.mailedLinkSubmitted(),
      actions.newPasswordAnswered(cloudUrl, invalidLink),
    ),
  ],
};

export const EmailConfirmedByLink: Story = {
  parameters: { appStore: { cloudUrl } },
  decorators: [
    withDispatchedActions(
      confirmationLinkOpened,
      actions.emailConfirmationAnswered({ ok: true, data: null }),
    ),
  ],
};

export const ConfirmationLinkInvalid: Story = {
  parameters: { appStore: { cloudUrl } },
  decorators: [
    withDispatchedActions(
      confirmationLinkOpened,
      actions.emailConfirmationAnswered(invalidLink),
    ),
  ],
};
