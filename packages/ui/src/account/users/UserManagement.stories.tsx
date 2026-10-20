import { actions } from "@easyimmerse/state";
import type { AccountRole, AccountUser } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../../storybook/withDispatchedActions.tsx";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { AccountSection } from "../AccountSection.tsx";

const user = (id: string, email: string, role: AccountRole): AccountUser => ({
  id,
  email,
  role,
  created_at_ms: 0,
});

const administrator = user("u1", "admin@example.com", "administrator");

const severalUsers = [
  administrator,
  user("u2", "someone@example.com", "library_user"),
  user("u3", "reader@example.com", "privileged"),
];

/** A server where the app is logged in as the given account, which lists the given accounts and answers account creations as given. */
const serverWith = (
  me: AccountUser,
  users: readonly AccountUser[],
  creation: FakeResponse = (request: { body?: { value: unknown } }) => ({
    id: "u9",
    created_at_ms: 0,
    ...(request.body?.value as object),
  }),
) => ({
  appStore: {
    server: { serverUrl: "https://books.example.org", token: "session-token" },
    client: createFakeBackendClient({
      ...fixtureResponses,
      "GET /auth/me": { kind: "account", user: me },
      "GET /users": users,
      "POST /users": creation,
    }),
  },
});

const filledIn = actions.newUserFormChanged({
  email: "new@example.com",
  password: "correct horse",
  role: "privileged",
});

const meta = {
  title: "Account/UserManagement",
  component: AccountSection,
  decorators: [withAppStore],
  parameters: serverWith(administrator, severalUsers),
} satisfies Meta<typeof AccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralUsers: Story = {};

export const EmptyList: Story = {
  parameters: serverWith(administrator, []),
};

export const Creating: Story = {
  parameters: serverWith(
    administrator,
    severalUsers,
    () => new Promise(() => undefined),
  ),
  decorators: [withDispatchedActions(filledIn, actions.newUserSubmitted())],
};

export const CreationFailed: Story = {
  parameters: serverWith(
    administrator,
    severalUsers,
    fakeFailure({
      status: 409,
      code: "email_taken",
      message: "The email is taken.",
    }),
  ),
  decorators: [withDispatchedActions(filledIn, actions.newUserSubmitted())],
};

export const ConfirmingDeletion: Story = {
  decorators: [withDispatchedActions(actions.userDeletionAsked("u2"))],
};

export const NotAnAdministrator: Story = {
  parameters: serverWith(
    user("u2", "someone@example.com", "library_user"),
    severalUsers,
  ),
};
