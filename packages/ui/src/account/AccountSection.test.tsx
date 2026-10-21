import type { CurrentPrincipal } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
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
      data: { accounts: true, open_signup: true },
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

    it("asks for an address once the person chooses their own server", () => {
      renderWithAppStore(<AccountSection />, undefined, {
        cloudUrl: "https://cloud.example.com",
      });
      fireEvent.click(screen.getByLabelText("Your own server"));
      expect(screen.getByLabelText("Server address")).toBeDefined();
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
          data: { accounts: true, open_signup: false },
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

  describe("while the app is connected", () => {
    it("names the account's role in words", async () => {
      renderConnected({ kind: "account", user: session.user });
      expect(await screen.findByText("library user")).toBeDefined();
    });

    it("tells that the app's own server needs no account", async () => {
      renderConnected({ kind: "launch" });
      expect(
        await screen.findByText(/This app uses its own easyImmerse server/),
      ).toBeDefined();
    });

    it("tells when the server no longer accepts the app's sign-in", async () => {
      renderConnected(
        fakeFailure({ status: 401, code: "unauthorized", message: "" }),
      );
      expect((await screen.findByRole("alert")).textContent).toBe(
        "The server no longer accepts this app's sign-in. Log out, then log in again.",
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
});
