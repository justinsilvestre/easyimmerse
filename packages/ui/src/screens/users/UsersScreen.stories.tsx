import { actions } from "@easyimmerse/state";
import type { AccountRole, AccountUser } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../../storybook/withDispatchedActions.tsx";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../../testSupport/createBuiltInServerClient.ts";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import {
  fixtureResponses,
  fixtureSyncLink,
} from "../../testSupport/fixtureResponses.ts";
import { UsersScreen } from "./UsersScreen.tsx";

const user = (
  id: string,
  email: string,
  role: AccountRole,
  managesLibrary = false,
): AccountUser => ({
  id,
  email,
  role,
  created_at_ms: 0,
  email_confirmed_at_ms: null,
  manages_library: managesLibrary,
});

const administrator = user("u1", "admin@example.com", "administrator");

const learner = user("u2", "someone@example.com", "library_user");

const severalUsers = [
  administrator,
  learner,
  user("u3", "reader@example.com", "privileged"),
  user("u4", "librarian@example.com", "privileged", true),
];

/** Answers an account creation with the account the form asked for. */
const createdAccount = (request: { body?: { value: unknown } }) => ({
  id: "u9",
  created_at_ms: 0,
  manages_library: false,
  ...(request.body?.value as object),
});

/** Never answers, so that the request stays under way. */
const neverAnswered = () => new Promise(() => undefined);

/** A server that lists the given accounts and answers the other routes as given. */
const serverWith = (
  users: FakeResponse,
  responses: Record<string, FakeResponse> = {},
) => ({
  appStore: {
    server: { serverUrl: "https://books.example.org", token: "session-token" },
    client: createFakeBackendClient({
      ...fixtureResponses,
      "GET /auth/me": { kind: "account", user: administrator },
      "GET /users": users,
      "POST /users": createdAccount,
      ...responses,
    }),
  },
});

/** Opens the menu of the account with the given email address once the list shows. */
const openMenuOf =
  (email: string) =>
  async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: `Manage ${email}`,
      }),
    );
  };

const filledIn = actions.newUserFormChanged({
  email: "new@example.com",
  password: "correct horse",
  role: "privileged",
});

const meta = {
  title: "Screens/Users/UsersScreen",
  component: UsersScreen,
  decorators: [withAppStore],
  args: { via: "self", onBack: fn() },
  parameters: serverWith(severalUsers),
} satisfies Meta<typeof UsersScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralUsers: Story = {};

/** A server admin's menu, whose Library admin and Full access stay checked while Server admin is. */
export const ServerAdminMenu: Story = {
  play: openMenuOf("admin@example.com"),
};

export const LearnerMenu: Story = {
  play: openMenuOf("someone@example.com"),
};

export const LibraryAdminMenu: Story = {
  play: openMenuOf("librarian@example.com"),
};

export const Searched: Story = {
  decorators: [withDispatchedActions(actions.userSearchChanged("reader"))],
};

export const NoAccountMatches: Story = {
  decorators: [withDispatchedActions(actions.userSearchChanged("nobody"))],
};

export const EmptyList: Story = {
  parameters: serverWith([]),
};

export const ListFailed: Story = {
  parameters: serverWith(
    fakeFailure({ status: 500, message: "The database is locked." }),
  ),
};

export const Creating: Story = {
  parameters: serverWith(severalUsers, { "POST /users": neverAnswered }),
  decorators: [
    withDispatchedActions(filledIn, actions.newUserSubmitted("self")),
  ],
};

export const CreationFailed: Story = {
  parameters: serverWith(severalUsers, {
    "POST /users": fakeFailure({
      status: 409,
      code: "email_taken",
      message: "The email is taken.",
    }),
  }),
  decorators: [
    withDispatchedActions(filledIn, actions.newUserSubmitted("self")),
  ],
};

export const AccessChanging: Story = {
  parameters: serverWith(severalUsers, { "PUT /users/u2/role": neverAnswered }),
  decorators: [
    withDispatchedActions(
      actions.userAccessToggled("self", learner, "fullAccess"),
    ),
  ],
};

/** Server admin unchecked for the server's only server admin, which the server refuses. */
export const OnlyServerAdmin: Story = {
  parameters: serverWith(severalUsers, {
    "PUT /users/u1/role": fakeFailure({
      status: 409,
      code: "last_administrator",
      message: "The server needs an administrator.",
    }),
    "PUT /users/u1/library-manager": administrator,
  }),
  decorators: [
    withDispatchedActions(
      actions.userAccessToggled("self", administrator, "serverAdmin"),
    ),
  ],
};

export const ConfirmingDeletion: Story = {
  decorators: [withDispatchedActions(actions.userDeletionAsked("u2"))],
};

export const Deleting: Story = {
  parameters: serverWith(severalUsers, { "DELETE /users/u2": neverAnswered }),
  decorators: [
    withDispatchedActions(
      actions.userDeletionAsked("u2"),
      actions.userDeletionConfirmed("self"),
    ),
  ],
};

/** The accounts of the desktop app's own server, opened from its Server page. */
export const OnThisComputer: Story = {
  parameters: {
    appStore: {
      server: builtInServerOn("desktop"),
      client: createBuiltInServerClient(null, { "GET /users": severalUsers }),
    },
  },
};

/** The accounts of the server the desktop app backs its work up to, opened from the account settings. */
export const OnTheLinkedServer: Story = {
  args: { via: "linkedRemote" },
  parameters: {
    appStore: {
      server: builtInServerOn("desktop"),
      client: createBuiltInServerClient(
        { ...fixtureSyncLink, account_role: "administrator" },
        { "GET /sync/remote/users": severalUsers },
      ),
    },
  },
};
