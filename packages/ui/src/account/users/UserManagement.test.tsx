import type { AccountRole, AccountUser } from "@easyimmerse/types";
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { requestsTo } from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { AccountSection } from "../AccountSection.tsx";

afterEach(cleanup);

const user = (id: string, email: string, role: AccountRole): AccountUser => ({
  id,
  email,
  role,
  created_at_ms: 0,
});

const administrator = user("u1", "admin@example.com", "administrator");

const reader = user("u2", "someone@example.com", "library_user");

/** Renders the section connected to a server that answers the given routes, beside a list of two accounts. */
function renderWith(responses: Record<string, FakeResponse>) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": { kind: "account", user: administrator },
    "GET /users": [administrator, reader],
    ...responses,
  });
  renderWithAppStore(<AccountSection />, client, {
    server: { serverUrl: "https://books.example.org", token: "t" },
  });
  return client;
}

const usersHeading = () => screen.queryByRole("heading", { name: "Users" });

const readerRole = () =>
  screen.findByRole("combobox", { name: "Role of someone@example.com" });

const type = (label: string, value: string) =>
  fireEvent.change(
    within(screen.getByRole("form", { name: "New account" })).getByLabelText(
      label,
    ),
    { target: { value } },
  );

function createAccount() {
  type("Email", "new@example.com");
  type("Password", "correct horse");
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("UserManagement", () => {
  describe("in the Account section", () => {
    it("shows for an administrator", async () => {
      renderWith({});
      expect(
        await screen.findByRole("heading", { name: "Users" }),
      ).toBeDefined();
    });

    it("is absent for an account that is not an administrator", async () => {
      renderWith({ "GET /auth/me": { kind: "account", user: reader } });
      await screen.findByText("library user");
      expect(usersHeading()).toBeNull();
    });

    it("shows for the server's owner when the server has accounts", async () => {
      renderWith({
        "GET /auth/me": { kind: "launch" },
        "GET /auth/server": { accounts: true, open_signup: false },
      });
      expect(
        await screen.findByRole("heading", { name: "Users" }),
      ).toBeDefined();
    });

    it("is absent for the server's owner when the server has no accounts", async () => {
      const client = renderWith({
        "GET /auth/me": { kind: "launch" },
        "GET /auth/server": { accounts: false, open_signup: false },
      });
      await waitFor(() =>
        expect(requestsTo(client.requests, "GET", "/auth/server")).toHaveLength(
          1,
        ),
      );
      expect(usersHeading()).toBeNull();
    });
  });

  it("names each account's role in words", async () => {
    renderWith({});
    const role = await readerRole();
    expect((role as HTMLSelectElement).selectedOptions[0]?.textContent).toBe(
      "library user",
    );
  });

  it("changes an account's role", async () => {
    const client = renderWith({ "PUT /users/u2/role": reader });
    fireEvent.change(await readerRole(), { target: { value: "privileged" } });
    await waitFor(() =>
      expect(
        requestsTo(client.requests, "PUT", "/users/u2/role")[0]?.body,
      ).toEqual({ kind: "json", value: { role: "privileged" } }),
    );
  });

  it("tells when the only administrator would lose its role", async () => {
    renderWith({
      "PUT /users/u1/role": fakeFailure({
        status: 409,
        code: "last_administrator",
        message: "",
      }),
    });
    fireEvent.change(
      await screen.findByRole("combobox", {
        name: "Role of admin@example.com",
      }),
      { target: { value: "library_user" } },
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This is the server's only administrator account, so it keeps its role. Make another account an administrator first.",
    );
  });

  it("asks to confirm a deletion before it deletes", async () => {
    const client = renderWith({ "DELETE /users/u2": undefined });
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete someone@example.com" }),
    );
    expect(requestsTo(client.requests, "DELETE", "/users/u2")).toEqual([]);
  });

  it("deletes the account once the deletion is confirmed", async () => {
    const client = renderWith({ "DELETE /users/u2": undefined });
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete someone@example.com" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await waitFor(() =>
      expect(requestsTo(client.requests, "DELETE", "/users/u2")).toHaveLength(
        1,
      ),
    );
  });

  it("creates an account with the form's email, password and role", async () => {
    const client = renderWith({
      "POST /users": user("u9", "new@example.com", "library_user"),
    });
    await readerRole();
    createAccount();
    await waitFor(() =>
      expect(requestsTo(client.requests, "POST", "/users")[0]?.body).toEqual({
        kind: "json",
        value: {
          email: "new@example.com",
          password: "correct horse",
          role: "library_user",
        },
      }),
    );
  });

  it("tells why the server refused to create an account", async () => {
    renderWith({
      "POST /users": fakeFailure({
        status: 400,
        code: "invalid_email",
        message: "",
      }),
    });
    await readerRole();
    createAccount();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This email address is not valid.",
    );
  });
});
