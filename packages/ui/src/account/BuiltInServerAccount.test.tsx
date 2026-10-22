import type { NativePlatform } from "@easyimmerse/state";
import type { SyncLink, SyncLinkState } from "@easyimmerse/types";
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
import { fixtureSyncLink } from "../testSupport/fixtureResponses.ts";
import { requestsTo } from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { BuiltInServerAccount } from "./BuiltInServerAccount.tsx";

afterEach(cleanup);

const cloudUrl = "https://cloud.example.org";

const never = () => new Promise(() => undefined);

/** Renders the account of the built-in server that reports the given link, on the desktop and with the easyImmerse cloud unless told otherwise. */
function renderBuiltIn(
  link: SyncLink | null,
  { platform = "desktop", hasCloud = true } = {} as {
    platform?: NativePlatform;
    hasCloud?: boolean;
  },
) {
  const client = createBuiltInServerClient(link, {
    "POST /sync/link": never,
    "DELETE /sync/link": never,
    "POST /sync/run": never,
  });
  return {
    client,
    ...renderWithAppStore(<BuiltInServerAccount />, client, {
      server: builtInServerOn(platform),
      cloudUrl: hasCloud ? cloudUrl : undefined,
    }),
  };
}

const linked: SyncLink = { ...fixtureSyncLink, last_synced_at_ms: Date.now() };

const linkIn = (state: SyncLinkState): SyncLink => ({ ...linked, state });

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Fills in the form for the easyImmerse cloud, sends it, and lets the cloud answer that it has accounts. */
async function submitToCloud() {
  const rendered = renderBuiltIn(null);
  await screen.findByLabelText("Email");
  type("Email", "someone@example.org");
  type("Password", "correct horse");
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
  await act(async () =>
    rendered.effects.resolveServerAuthInfo({
      ok: true,
      data: { accounts: true, open_signup: true, sends_email: false },
    }),
  );
  return rendered;
}

describe("BuiltInServerAccount", () => {
  describe("while no server keeps a copy of the work", () => {
    it("tells that the desktop app keeps the work on this computer", async () => {
      renderBuiltIn(null);
      expect(
        await screen.findByText(
          "The desktop app keeps your work on this computer. Log in to the easyImmerse cloud or to your own server to keep a copy of your work there as well.",
        ),
      ).toBeDefined();
    });

    it("tells that the mobile app keeps the work on this device", async () => {
      renderBuiltIn(null, { platform: "mobile" });
      expect(
        await screen.findByText(
          "The mobile app keeps your work on this device. Log in to the easyImmerse cloud or to your own server to keep a copy of your work there as well.",
        ),
      ).toBeDefined();
    });

    it("offers only the person's own server when the app knows of no cloud", async () => {
      renderBuiltIn(null, { hasCloud: false });
      expect(
        await screen.findByText(
          "The desktop app keeps your work on this computer. Log in to your own easyImmerse server to keep a copy of your work there as well.",
        ),
      ).toBeDefined();
    });

    it("asks the built-in server to log in to the server chosen", async () => {
      const { client } = await submitToCloud();
      await waitFor(() =>
        expect(requestsTo(client.requests, "POST", "/sync/link")).toHaveLength(
          1,
        ),
      );
    });

    it("shows that it is logging in until the built-in server answers", async () => {
      await submitToCloud();
      expect(
        await screen.findByRole("button", { name: "Logging in…" }),
      ).toBeDefined();
    });
  });

  it("tells that the work is being copied for the first time", async () => {
    renderBuiltIn({
      ...fixtureSyncLink,
      state: { kind: "syncing" },
      last_synced_at_ms: null,
    });
    expect(
      await screen.findByText("Copying your work to cloud.example.org…"),
    ).toBeDefined();
  });

  describe("while a server keeps a copy of the work", () => {
    it("shows the account's email address", async () => {
      renderBuiltIn(linked);
      expect(await screen.findByText("someone@example.org")).toBeDefined();
    });

    it("tells that the copy is up to date", async () => {
      renderBuiltIn(linked);
      expect(await screen.findByText("Up to date")).toBeDefined();
    });

    it("tells when the work was last copied", async () => {
      renderBuiltIn(linked);
      expect(await screen.findByText(/^today at /)).toBeDefined();
    });

    it("links to the storage the account has on the server", async () => {
      renderBuiltIn(linked);
      const link = await screen.findByRole("link", {
        name: "Storage on cloud.example.org",
      });
      expect(link.getAttribute("href")).toBe("#settings-storage");
    });

    it("tells when a media file did not fit on the server", async () => {
      renderBuiltIn({
        ...linked,
        refused_upload: {
          media_file_id: "m1",
          name: "Episode 4.mp4",
          code: "quota_exceeded",
          message: "the copy takes 20 bytes, and only 10 bytes are free",
        },
      });
      expect(
        await screen.findByText(
          "Couldn't keep a copy of Episode 4.mp4 on cloud.example.org: there isn't enough room there.",
        ),
      ).toBeDefined();
    });

    it("lists the devices the account is logged in on", async () => {
      renderBuiltIn(linked);
      expect(await screen.findByText("This device")).toBeDefined();
    });

    it("lists the server's accounts for an administrator", async () => {
      renderBuiltIn({ ...linked, account_role: "administrator" });
      expect(
        await screen.findByRole("heading", { name: "Users" }),
      ).toBeDefined();
    });

    it("tells that logging out keeps the work on this computer", async () => {
      renderBuiltIn(linked);
      expect(
        await screen.findByText("Your work stays on this computer."),
      ).toBeDefined();
    });

    it("asks the built-in server to log out of the server named", async () => {
      const { client } = renderBuiltIn(linked);
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Log out of cloud.example.org",
        }),
      );
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "DELETE", "/sync/link"),
        ).toHaveLength(1),
      );
    });
  });

  describe("while the server cannot be reached", () => {
    const unreachable = linkIn({
      kind: "unreachable",
      since_ms: new Date(2026, 9, 21, 9, 0).getTime(),
    });

    it("tells since when and that the work is kept on this computer", async () => {
      renderBuiltIn(unreachable);
      expect(
        await screen.findByText(
          "Couldn't reach cloud.example.org since Oct 21, 2026, 9:00 AM. Your work is kept on this computer and will be copied there when the server can be reached.",
        ),
      ).toBeDefined();
    });

    it("asks the built-in server to try again", async () => {
      const { client } = renderBuiltIn(unreachable);
      fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
      await waitFor(() =>
        expect(requestsTo(client.requests, "POST", "/sync/run")).toHaveLength(
          1,
        ),
      );
    });
  });

  describe("while the server has logged this device out", () => {
    const loggedOut = linkIn({ kind: "logged_out" });

    it("tells that the work is not being copied there", async () => {
      renderBuiltIn(loggedOut);
      expect(
        await screen.findByText(
          "You were logged out of cloud.example.org on this computer, so your work isn't being copied there.",
        ),
      ).toBeDefined();
    });

    it("fills in the form with the account's email to log in again", async () => {
      renderBuiltIn(loggedOut);
      fireEvent.click(
        await screen.findByRole("button", { name: "Log in again" }),
      );
      expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
        "someone@example.org",
      );
    });
  });

  it("tells why the server refused to synchronize", async () => {
    renderBuiltIn(
      linkIn({ kind: "failed", code: "forbidden", message: "Not allowed." }),
    );
    expect(await screen.findByText("Not allowed.")).toBeDefined();
  });
});
