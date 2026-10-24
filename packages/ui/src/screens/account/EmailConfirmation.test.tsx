import type { AccountUser } from "@easyimmerse/types";
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
  type FakeResponse,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { AccountSection } from "./AccountSection.tsx";

afterEach(cleanup);

const ownServer = "https://books.example.org";

const unconfirmed: AccountUser = {
  id: "u1",
  email: "someone@example.com",
  role: "library_user",
  created_at_ms: 0,
  email_confirmed_at_ms: null,
};

/** Renders the section connected as the account, on a server that sends email or not, with the given answer to asking for another link. */
function renderAccount(
  user: AccountUser,
  sendsEmail: boolean,
  resend: FakeResponse = undefined,
) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": { kind: "account", user },
    "GET /auth/server": {
      accounts: true,
      open_signup: true,
      sends_email: sendsEmail,
    },
    "POST /auth/confirmation-email": resend,
  });
  renderWithAppStore(<AccountSection />, client, {
    server: { serverUrl: ownServer, token: "session-token" },
  });
  return client;
}

describe("EmailConfirmation", () => {
  it("tells that the address is not confirmed yet on a server that sends email", async () => {
    renderAccount(unconfirmed, true);
    expect(await screen.findByText("Not confirmed yet.")).toBeDefined();
  });

  it("tells nothing of confirmation on a server that sends no email", async () => {
    renderAccount(unconfirmed, false);
    await screen.findByText("library user");
    await act(async () => undefined);
    expect(screen.queryByText(/confirmed/i)).toBeNull();
  });

  it("tells that a confirmed address is confirmed", async () => {
    renderAccount({ ...unconfirmed, email_confirmed_at_ms: 1 }, true);
    expect(await screen.findByText("Confirmed")).toBeDefined();
  });

  it("asks the server to mail another link", async () => {
    const client = renderAccount(unconfirmed, true);
    fireEvent.click(
      await screen.findByRole("button", { name: "Send a confirmation link" }),
    );
    await waitFor(() =>
      expect(client.requests).toContainEqual({
        method: "POST",
        path: "/auth/confirmation-email",
      }),
    );
  });

  it("tells where it sent the link once the server mailed it", async () => {
    renderAccount(unconfirmed, true, null);
    fireEvent.click(
      await screen.findByRole("button", { name: "Send a confirmation link" }),
    );
    expect(
      await screen.findByText("We sent a link to someone@example.com."),
    ).toBeDefined();
  });

  it("offers to send the link again once the server mailed it", async () => {
    renderAccount(unconfirmed, true, null);
    fireEvent.click(
      await screen.findByRole("button", { name: "Send a confirmation link" }),
    );
    expect(
      await screen.findByRole("button", { name: "Send it again" }),
    ).toBeDefined();
  });

  it("tells how long to wait when the server refuses another link so soon", async () => {
    renderAccount(
      unconfirmed,
      true,
      fakeFailure({
        status: 429,
        code: "too_many_attempts",
        message: "",
        retryAfterSeconds: 42,
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Send a confirmation link" }),
    );
    expect(
      await screen.findByText("Wait 42 seconds before asking again."),
    ).toBeDefined();
  });
});
