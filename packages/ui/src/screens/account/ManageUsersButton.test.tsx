import { selectRoute } from "@easyimmerse/state";
import type { AccountUser } from "@easyimmerse/types";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeBackendClient,
  type FakeResponse,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { requestsTo } from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { AccountSection } from "./AccountSection.tsx";

afterEach(cleanup);

const account = (role: AccountUser["role"]): AccountUser => ({
  id: "u1",
  email: "someone@example.com",
  role,
  created_at_ms: 0,
  email_confirmed_at_ms: null,
  manages_library: false,
});

/** Renders the account settings of an app connected to a server that answers the given routes. */
function renderWith(responses: Record<string, FakeResponse>) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /users": { users: [], total: 0 },
    ...responses,
  });
  const rendered = renderWithAppStore(<AccountSection />, client, {
    server: { serverUrl: "https://books.example.org", token: "t" },
  });
  return { client, ...rendered };
}

const manageUsers = () =>
  screen.queryByRole("button", { name: "Manage users" });

describe("ManageUsersButton on the account settings screen", () => {
  it("opens the Users page for a server admin", async () => {
    const { store } = renderWith({
      "GET /auth/me": { kind: "account", user: account("administrator") },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Manage users" }),
    );
    expect(selectRoute(store.getState())).toMatchObject({ pages: ["users"] });
  });

  it("is absent for an account that is not a server admin", async () => {
    renderWith({
      "GET /auth/me": { kind: "account", user: account("privileged") },
    });
    await screen.findByText("Full access");
    expect(manageUsers()).toBeNull();
  });

  it("shows for the server's owner when the server has accounts", async () => {
    renderWith({
      "GET /auth/me": { kind: "launch" },
      "GET /auth/server": { accounts: true, open_signup: false },
    });
    expect(
      await screen.findByRole("button", { name: "Manage users" }),
    ).toBeDefined();
  });

  it("is absent for the server's owner when the server has no accounts", async () => {
    const { client } = renderWith({
      "GET /auth/me": { kind: "launch" },
      "GET /auth/server": { accounts: false, open_signup: false },
    });
    await waitFor(() =>
      expect(requestsTo(client.requests, "GET", "/auth/server")).toHaveLength(
        1,
      ),
    );
    expect(manageUsers()).toBeNull();
  });
});
