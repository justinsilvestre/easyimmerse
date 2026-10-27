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
import { fakeUsersPages } from "../../testSupport/fakeUsersPages.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { requestsTo } from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { UsersScreen } from "./UsersScreen.tsx";

afterEach(cleanup);

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

const reader = user("u2", "someone@example.com", "library_user");

const librarian = user("u3", "librarian@example.com", "privileged", true);

/** Renders the Users page of the app's server, which answers the given routes beside a list of three accounts. */
function renderWith(responses: Record<string, FakeResponse>) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": { kind: "account", user: administrator },
    "GET /users": fakeUsersPages([administrator, reader, librarian]),
    ...responses,
  });
  renderWithAppStore(<UsersScreen via="self" backHref="/" />, client, {
    server: { serverUrl: "https://books.example.org", token: "t" },
  });
  return client;
}

/** Accounts whose email addresses are `user0@example.com` and so on. */
const manyUsers = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    user(`m${index}`, `user${index}@example.com`, "library_user"),
  );

/** Opens the menu of the account with the given email address, once the list shows. */
async function openMenuOf(email: string) {
  fireEvent.click(
    await screen.findByRole("button", { name: `Manage ${email}` }),
  );
}

const menuItem = (name: string) =>
  screen.getByRole("menuitemcheckbox", { name });

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

async function search(text: string) {
  fireEvent.change(await screen.findByLabelText("Search by email"), {
    target: { value: text },
  });
}

describe("UsersScreen", () => {
  it("names the server whose accounts it lists", async () => {
    renderWith({});
    expect(
      await screen.findByText("The accounts on books.example.org."),
    ).toBeDefined();
  });

  it("summarizes what each account may do", async () => {
    renderWith({});
    expect(
      await screen.findByText("Library admin · Full access"),
    ).toBeDefined();
  });

  it("names an account with no other access a learner", async () => {
    renderWith({});
    expect(await screen.findByText("Learner")).toBeDefined();
  });

  describe("in an account's menu", () => {
    it("gives the account full access", async () => {
      const client = renderWith({ "PUT /users/u2/role": reader });
      await openMenuOf("someone@example.com");
      fireEvent.click(menuItem("Full access"));
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "PUT", "/users/u2/role")[0]?.body,
        ).toEqual({ kind: "json", value: { role: "privileged" } }),
      );
    });

    it("makes the account a library admin", async () => {
      const client = renderWith({
        "PUT /users/u2/library-manager": { ...reader, manages_library: true },
      });
      await openMenuOf("someone@example.com");
      fireEvent.click(menuItem("Library admin"));
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "PUT", "/users/u2/library-manager")[0]
            ?.body,
        ).toEqual({ kind: "json", value: { manages_library: true } }),
      );
    });

    it("makes the account a server admin", async () => {
      const client = renderWith({ "PUT /users/u3/role": librarian });
      await openMenuOf("librarian@example.com");
      fireEvent.click(menuItem("Server admin"));
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "PUT", "/users/u3/role")[0]?.body,
        ).toEqual({ kind: "json", value: { role: "administrator" } }),
      );
    });

    it("shows a server admin's Library admin checked", async () => {
      renderWith({});
      await openMenuOf("admin@example.com");
      expect(menuItem("Library admin").getAttribute("aria-checked")).toBe(
        "true",
      );
    });

    it("keeps a server admin's Full access from being unchecked", async () => {
      renderWith({});
      await openMenuOf("admin@example.com");
      expect(menuItem("Full access").getAttribute("aria-disabled")).toBe(
        "true",
      );
    });

    it("tells when the only server admin would lose Server admin", async () => {
      renderWith({
        "PUT /users/u1/role": fakeFailure({
          status: 409,
          code: "last_administrator",
          message: "",
        }),
        "PUT /users/u1/library-manager": administrator,
      });
      await openMenuOf("admin@example.com");
      fireEvent.click(menuItem("Server admin"));
      expect((await screen.findByRole("alert")).textContent).toBe(
        "You can't take Server admin away from the server's only server admin. Make another account a server admin first.",
      );
    });

    it("asks to confirm a deletion before it deletes", async () => {
      const client = renderWith({ "DELETE /users/u2": undefined });
      await openMenuOf("someone@example.com");
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
      expect(requestsTo(client.requests, "DELETE", "/users/u2")).toEqual([]);
    });

    it("deletes the account once the deletion is confirmed", async () => {
      const client = renderWith({ "DELETE /users/u2": undefined });
      await openMenuOf("someone@example.com");
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
      await waitFor(() =>
        expect(requestsTo(client.requests, "DELETE", "/users/u2")).toHaveLength(
          1,
        ),
      );
    });
  });

  describe("when searching", () => {
    it("lists only the accounts whose email contains the search", async () => {
      renderWith({});
      await search("someone");
      expect(screen.queryByText("admin@example.com")).toBeNull();
    });

    it("tells how many accounts match", async () => {
      renderWith({});
      await search("someone");
      expect(await screen.findByText("1 account matches.")).toBeDefined();
    });

    it("tells when no account matches", async () => {
      renderWith({});
      await search("nobody");
      expect(
        await screen.findByText(
          "No account's email address contains “nobody”.",
        ),
      ).toBeDefined();
    });

    it("asks the server for the accounts matching the search", async () => {
      const client = renderWith({});
      await search(" someone ");
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "GET", "/users").at(-1)?.query?.search,
        ).toBe("someone"),
      );
    });

    it("finds an account beyond the first page", async () => {
      renderWith({ "GET /users": fakeUsersPages(manyUsers(120)) });
      await search("user119@");
      expect(await screen.findByText("user119@example.com")).toBeDefined();
    });
  });

  describe("when the accounts fill more than one page", () => {
    const renderManyUsers = () =>
      renderWith({ "GET /users": fakeUsersPages(manyUsers(120)) });

    it("tells which of them the page shows", async () => {
      renderManyUsers();
      expect(await screen.findByText("Accounts 1–50 of 120.")).toBeDefined();
    });

    it("lists the next page's accounts after Next page", async () => {
      renderManyUsers();
      fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
      expect(await screen.findByText("user50@example.com")).toBeDefined();
    });

    it("asks the server for the next page's accounts after Next page", async () => {
      const client = renderManyUsers();
      fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "GET", "/users").at(-1)?.query?.offset,
        ).toBe("50"),
      );
    });

    it("keeps Next page unavailable on the last page", async () => {
      renderManyUsers();
      fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
      fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
      await screen.findByText("Accounts 101–120 of 120.");
      expect(
        screen
          .getByRole("button", { name: "Next page" })
          .hasAttribute("disabled"),
      ).toBe(true);
    });
  });

  it("creates an account with the form's email, password and access", async () => {
    const client = renderWith({
      "POST /users": user("u9", "new@example.com", "library_user"),
    });
    await screen.findByText("Learner");
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
    await screen.findByText("Learner");
    createAccount();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This email address is not valid.",
    );
  });
});
