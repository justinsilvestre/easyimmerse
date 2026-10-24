import { actions, type ServerConfig, selectRoute } from "@easyimmerse/state";
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
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureResponses,
  fixtureSyncLink,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProfileMenu } from "./ProfileMenu.tsx";

afterEach(cleanup);

const accountServer: ServerConfig = {
  serverUrl: "https://books.example.org",
  token: "t",
};

const accountUser = {
  id: "u1",
  email: "reader@example.org",
  role: "library_user",
  created_at_ms: 0,
  email_confirmed_at_ms: null,
};

/** Renders the menu in an app that runs offline, logged in to no account. */
function renderLoggedOut() {
  return renderWithAppStore(<ProfileMenu />);
}

/** Renders the menu in the desktop app, whose built-in server is linked to an account on the easyImmerse cloud. */
function renderLinked() {
  return renderWithAppStore(
    <ProfileMenu />,
    createBuiltInServerClient(fixtureSyncLink),
    {
      server: builtInServerOn("desktop"),
      cloudUrl: fixtureSyncLink.server_url,
    },
  );
}

/** Renders the menu connected to the server of an account. */
function renderOnAccountServer() {
  return renderWithAppStore(
    <ProfileMenu />,
    createFakeBackendClient({
      ...fixtureResponses,
      "GET /auth/me": { kind: "account", user: accountUser },
    }),
    { server: accountServer },
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Profile" }));
}

describe("ProfileMenu", () => {
  describe("while not logged in", () => {
    it("shows no initial on its button", () => {
      renderLoggedOut();
      expect(screen.getByRole("button", { name: "Profile" }).textContent).toBe(
        "",
      );
    });

    it("says so", () => {
      renderLoggedOut();
      openMenu();
      expect(
        screen.getByRole("dialog", { name: "Profile" }).textContent,
      ).toContain("Not logged in");
    });

    it("opens the log-in screen", () => {
      const { store } = renderLoggedOut();
      openMenu();
      fireEvent.click(
        screen.getByRole("button", { name: "Log in or sign up" }),
      );
      expect(selectRoute(store.getState())).toMatchObject({
        screen: "settings",
        pages: ["account"],
      });
    });
  });

  describe("while its built-in server is linked to an account", () => {
    it("shows the first letter of the account's email address on its button", async () => {
      renderLinked();
      const button = screen.getByRole("button", { name: "Profile" });
      await waitFor(() => expect(button.textContent).toBe("S"));
    });

    it("names the account's server", async () => {
      renderLinked();
      openMenu();
      expect(await screen.findByText("The easyImmerse cloud")).toBeTruthy();
    });

    it("opens the account settings", async () => {
      const { store } = renderLinked();
      openMenu();
      fireEvent.click(await screen.findByRole("button", { name: "Account" }));
      expect(selectRoute(store.getState())).toMatchObject({
        pages: ["account"],
      });
    });
  });

  describe("while connected to the server of an account", () => {
    it("shows the account's email address", async () => {
      renderOnAccountServer();
      openMenu();
      expect(await screen.findByText("reader@example.org")).toBeTruthy();
    });
  });

  it("offers the theme choices", () => {
    renderLoggedOut();
    openMenu();
    expect(screen.getByRole("group", { name: "Theme" })).toBeTruthy();
  });

  it("opens the settings", () => {
    const { store } = renderLoggedOut();
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(selectRoute(store.getState())).toMatchObject({ pages: ["general"] });
  });

  it("closes once a row is chosen", () => {
    renderLoggedOut();
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  describe("while Settings are open", () => {
    function renderOverAccountPage() {
      const rendered = renderLoggedOut();
      act(() => {
        rendered.store.dispatch(actions.navigated({ type: "openSettings" }));
        rendered.store.dispatch(
          actions.navigated({ type: "openAccountSettings" }),
        );
      });
      openMenu();
      return rendered;
    }

    it("marks Settings as the current page", () => {
      renderOverAccountPage();
      expect(
        screen
          .getByRole("button", { name: "Settings" })
          .getAttribute("aria-current"),
      ).toBe("page");
    });

    it("leaves the settings page shown when Settings is chosen", () => {
      const { store } = renderOverAccountPage();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(selectRoute(store.getState())).toMatchObject({
        pages: ["general", "account"],
      });
    });
  });
});
