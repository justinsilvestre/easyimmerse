import type { AccountUser, SessionSummary } from "@easyimmerse/types";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeBackendClient,
  type FakeResponse,
} from "../../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { AccountSection } from "./AccountSection.tsx";

afterEach(cleanup);

const ownServer = "https://books.example.org";

const user: AccountUser = {
  id: "u1",
  email: "someone@example.com",
  role: "library_user",
  created_at_ms: 0,
  email_confirmed_at_ms: null,
};

const session = (
  id: string,
  userAgent: string,
  isCurrent: boolean,
): SessionSummary => ({
  id,
  created_at_ms: Date.now(),
  last_used_at_ms: Date.now(),
  user_agent: userAgent,
  is_current: isCurrent,
});

const firefoxOnLinux =
  "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0";

const sessions = {
  sessions: [session("s1", "", true), session("s2", firefoxOnLinux, false)],
};

/** Renders the section connected as an account logged in on two devices, with the given answers to logging one out. */
function renderDevices(deletion: FakeResponse = undefined) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": { kind: "account", user },
    "GET /auth/sessions": sessions,
    "DELETE /auth/sessions/s1": deletion,
    "DELETE /auth/sessions/s2": deletion,
  });
  return {
    client,
    ...renderWithAppStore(<AccountSection />, client, {
      server: { serverUrl: ownServer, token: "session-token" },
    }),
  };
}

describe("DeviceList", () => {
  it("names each device the account is logged in on", async () => {
    renderDevices();
    expect(await screen.findByText("Firefox on Linux")).toBeDefined();
  });

  it("marks this device", async () => {
    renderDevices();
    expect(await screen.findByText("This device")).toBeDefined();
  });

  it("tells when each device logged in and was last used", async () => {
    renderDevices();
    expect(
      await screen.findAllByText("Logged in today. Last used today."),
    ).toHaveLength(2);
  });

  it("logs out another device", async () => {
    const { client } = renderDevices();
    fireEvent.click(
      await screen.findByRole("button", { name: "Log out Firefox on Linux" }),
    );
    await waitFor(() =>
      expect(client.requests).toContainEqual({
        method: "DELETE",
        path: "/auth/sessions/s2",
      }),
    );
  });

  it("shows that another device is being logged out", async () => {
    renderDevices(() => new Promise(() => undefined));
    fireEvent.click(
      await screen.findByRole("button", { name: "Log out Firefox on Linux" }),
    );
    expect(
      (await screen.findByRole("button", { name: "Log out Firefox on Linux" }))
        .textContent,
    ).toBe("Logging out…");
  });

  it("disconnects once this device is logged out", async () => {
    const { effects } = renderDevices();
    fireEvent.click(
      await screen.findByRole("button", { name: "Log out this device" }),
    );
    await waitFor(() =>
      expect(effects.calls).toContainEqual({ type: "disconnectFromServer" }),
    );
  });
});
