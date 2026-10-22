import type { CurrentPrincipal, SyncLink } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureResponses,
  fixtureSyncLink,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { AccountSection } from "./AccountSection.tsx";

afterEach(cleanup);

const ownServer = "https://books.example.org";

const session = {
  token: "session-token",
  user: {
    id: "u1",
    email: "someone@example.com",
    role: "library_user",
    created_at_ms: 0,
    email_confirmed_at_ms: null,
  },
} as const;

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Renders the section offline, fills in the form for the own server, and sends it. */
function submitOwnServerForm() {
  const rendered = renderWithAppStore(<AccountSection />);
  type("Server address", ownServer);
  type("Email", "someone@example.com");
  type("Password", "correct horse");
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
  return rendered;
}

/** Sends the form and lets the server answer that it has accounts open to sign-up. */
async function submittedToOpenServer() {
  const rendered = submitOwnServerForm();
  await act(async () =>
    rendered.effects.resolveServerAuthInfo({
      ok: true,
      data: { accounts: true, open_signup: true, sends_email: false },
    }),
  );
  return rendered;
}

/** Renders the section connected to a server that answers who the app's token belongs to as given. */
function renderConnected(
  principal: CurrentPrincipal | ReturnType<typeof fakeFailure>,
) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": principal,
    "POST /auth/logout": undefined,
  });
  return {
    client,
    ...renderWithAppStore(<AccountSection />, client, {
      server: { serverUrl: ownServer, token: "session-token" },
    }),
  };
}

describe("AccountSection", () => {
  describe("while the app runs offline", () => {
    it("asks for the address of the person's own server when there is no official one", () => {
      renderWithAppStore(<AccountSection />);
      expect(screen.getByLabelText("Server address")).toBeDefined();
    });

    it("chooses the official server when there is one", () => {
      renderWithAppStore(<AccountSection />, undefined, {
        cloudUrl: "https://cloud.example.com",
      });
      expect(screen.queryByLabelText("Server address")).toBeNull();
    });

    it("asks for an address once More options is opened", () => {
      renderWithAppStore(<AccountSection />, undefined, {
        cloudUrl: "https://cloud.example.com",
      });
      fireEvent.click(screen.getByRole("button", { name: "More options" }));
      expect(screen.getByLabelText("Server address")).toBeDefined();
    });

    it("goes back to the easyImmerse cloud once More options is closed", () => {
      renderWithAppStore(<AccountSection />, undefined, {
        cloudUrl: "https://cloud.example.com",
      });
      fireEvent.click(screen.getByRole("button", { name: "More options" }));
      fireEvent.click(screen.getByRole("button", { name: "More options" }));
      expect(screen.queryByLabelText("Server address")).toBeNull();
    });

    it("is headed Log in", () => {
      renderWithAppStore(<AccountSection />);
      expect(screen.getByRole("heading", { name: "Log in" })).toBeDefined();
    });

    it("asks the server what it offers when the form is sent", () => {
      const { effects } = submitOwnServerForm();
      expect(effects.calls).toContainEqual({
        type: "fetchServerAuthInfo",
        serverUrl: ownServer,
      });
    });

    it("shows that it is checking the server", () => {
      submitOwnServerForm();
      expect(
        screen.getByRole("button", { name: "Checking the server…" }),
      ).toBeDefined();
    });

    it("tells when the server lets nobody sign up", async () => {
      const { effects } = renderWithAppStore(<AccountSection />);
      type("Server address", ownServer);
      fireEvent.click(screen.getByLabelText("Sign up"));
      type("Email", "someone@example.com");
      type("Password", "correct horse");
      fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
      await act(async () =>
        effects.resolveServerAuthInfo({
          ok: true,
          data: { accounts: true, open_signup: false, sends_email: false },
        }),
      );
      expect(
        screen.getByText(
          "This server does not let anyone sign up. Ask its administrator for an account, then log in.",
        ),
      ).toBeDefined();
    });

    it("connects to the server once it opens a session", async () => {
      const { effects } = await submittedToOpenServer();
      await act(async () =>
        effects.resolveSession({ ok: true, data: session }),
      );
      expect(effects.calls).toContainEqual({
        type: "connectToServer",
        server: { serverUrl: ownServer, token: "session-token" },
      });
    });

    it("tells when the email or password is wrong", async () => {
      const { effects } = await submittedToOpenServer();
      await act(async () =>
        effects.resolveSession({
          ok: false,
          error: { status: 401, code: "invalid_credentials", message: "" },
        }),
      );
      expect(screen.getByRole("alert").textContent).toBe(
        "Incorrect email address or password.",
      );
    });
  });

  describe("while a password is chosen for signing up", () => {
    /** Renders the section offline in signup mode with the given password typed. */
    function typeSignupPassword(password: string) {
      renderWithAppStore(<AccountSection />);
      fireEvent.click(screen.getByLabelText("Sign up"));
      type("Password", password);
    }

    it("shows how strong the password is once one is typed", () => {
      typeSignupPassword("marigold");
      expect(
        screen.getByRole("meter", { name: "Password strength" }),
      ).toBeDefined();
    });

    it("shows no strength while logging in", () => {
      renderWithAppStore(<AccountSection />);
      type("Password", "marigold");
      expect(screen.queryByRole("meter")).toBeNull();
    });

    it("rates a long passphrase strong", () => {
      typeSignupPassword("correct horse battery staple");
      expect(screen.queryByText("Strong")).not.toBeNull();
    });

    it("advises a short password to grow longer", () => {
      typeSignupPassword("marigold");
      expect(
        screen.queryByText(
          "Add a longer phrase; length matters more than symbols.",
        ),
      ).not.toBeNull();
    });
  });

  describe("while the app is connected", () => {
    it("is headed Account", async () => {
      renderConnected({ kind: "account", user: session.user });
      expect(
        await screen.findByRole("heading", { name: "Account" }),
      ).toBeDefined();
    });

    it("names the account's role in words", async () => {
      renderConnected({ kind: "account", user: session.user });
      expect(await screen.findByText("library user")).toBeDefined();
    });

    it("tells that the app's own server needs no account", async () => {
      renderConnected({ kind: "launch" });
      expect(
        await screen.findByText(/set up to use its own easyImmerse server/),
      ).toBeDefined();
    });

    it("tells when the server has logged the app out", async () => {
      renderConnected(
        fakeFailure({ status: 401, code: "unauthorized", message: "" }),
      );
      expect((await screen.findByRole("alert")).textContent).toBe(
        "You were logged out of books.example.org. Log in again to keep using your account here.",
      );
    });

    it("goes back to the form to log in again once the server has logged the app out", async () => {
      const { effects } = renderConnected(
        fakeFailure({ status: 401, code: "unauthorized", message: "" }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Log in again" }),
      );
      await waitFor(() =>
        expect(effects.calls).toContainEqual({ type: "disconnectFromServer" }),
      );
    });

    it("disconnects once the server has ended the session", async () => {
      const { effects } = renderConnected({
        kind: "account",
        user: session.user,
      });
      fireEvent.click(await screen.findByRole("button", { name: "Log out" }));
      await waitFor(() =>
        expect(effects.calls).toContainEqual({ type: "disconnectFromServer" }),
      );
    });
  });

  describe("while the app runs on its built-in server", () => {
    const renderBuiltIn = (link: SyncLink | null) =>
      renderWithAppStore(<AccountSection />, createBuiltInServerClient(link), {
        server: builtInServerOn("desktop"),
      });

    it("is headed Log in while no server keeps a copy of the work", async () => {
      renderBuiltIn(null);
      expect(
        await screen.findByRole("heading", { name: "Log in" }),
      ).toBeDefined();
    });

    it("offers to log in to a server that backs up the work", async () => {
      renderBuiltIn(null);
      expect(await screen.findByText(/Log in to back it up to/)).toBeDefined();
    });

    it("shows the account on the server that keeps a copy of the work", async () => {
      renderBuiltIn(fixtureSyncLink);
      expect(
        await screen.findByRole("button", {
          name: "Log out of cloud.example.org",
        }),
      ).toBeDefined();
    });
  });
});
