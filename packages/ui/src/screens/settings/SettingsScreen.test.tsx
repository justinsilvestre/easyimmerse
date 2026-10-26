import {
  actions,
  selectIsSuggestionDismissed,
  selectRoute,
} from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { SettingsScreen } from "./SettingsScreen.tsx";

afterEach(cleanup);

function renderSettings() {
  return renderWithAppStore(<SettingsScreen backHref="/" />);
}

const showAgainName = "Show dismissed suggestions again";

function getGroup(name: string) {
  return within(screen.getByRole("region", { name }));
}

describe("SettingsScreen", () => {
  it("links Back to the screen beneath Settings", () => {
    renderWithAppStore(<SettingsScreen backHref="/projects/p1" />);
    expect(
      screen.getByRole("link", { name: "Back" }).getAttribute("href"),
    ).toBe("/projects/p1");
  });

  it("opens the dictionaries settings from their link", () => {
    const { store } = renderSettings();
    fireEvent.click(screen.getByRole("link", { name: /Dictionaries/ }));
    expect(selectRoute(store.getState())).toMatchObject({
      pages: ["dictionaries"],
    });
  });

  it("opens the account settings screen from its link", () => {
    const { store } = renderSettings();
    fireEvent.click(screen.getByRole("link", { name: /^Account/ }));
    expect(selectRoute(store.getState())).toMatchObject({
      pages: ["account"],
    });
  });

  it("tells on the account button that the app is logged in to no account", () => {
    renderWithAppStore(<SettingsScreen backHref="/" />);
    expect(screen.getByText(/You are not logged in/)).toBeDefined();
  });

  it("marks the Profile menu's Settings row as the page already open", () => {
    const { store } = renderWithAppStore(<SettingsScreen backHref="/" />);
    act(() => {
      store.dispatch(actions.navigated({ type: "openSettings" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Profile" }));
    expect(
      screen
        .getByRole("button", { name: "Settings" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("shows the subtitle appearance controls in a Subtitles section", () => {
    renderWithAppStore(<SettingsScreen backHref="/" />);
    expect(
      within(screen.getByRole("region", { name: "Subtitles" })).getByRole(
        "slider",
        { name: "Background opacity" },
      ),
    ).toBeDefined();
  });

  it("treats conversion as unavailable until told otherwise", () => {
    renderWithAppStore(<SettingsScreen backHref="/" />);
    expect(
      screen.getByText(
        "Media conversion is unavailable, so there is no cache.",
      ),
    ).toBeDefined();
  });

  it("shows the lossless audio toggle in a Media conversion section", () => {
    renderWithAppStore(<SettingsScreen backHref="/" />);
    expect(
      within(
        screen.getByRole("region", { name: "Media conversion" }),
      ).getByRole("checkbox", { name: "Keep audio lossless when converting" }),
    ).toBeDefined();
  });

  it("shows the Server row on the desktop app", () => {
    renderWithAppStore(<SettingsScreen backHref="/" />, undefined, {
      server: {
        serverUrl: "http://127.0.0.1:5000",
        token: "t",
        bundledIn: "desktop",
      },
    });
    expect(screen.getByRole("link", { name: /^Server/ })).toBeDefined();
  });

  it("shows no Server row elsewhere", () => {
    renderWithAppStore(<SettingsScreen backHref="/" />);
    expect(screen.queryByRole("link", { name: /^Server/ })).toBeNull();
  });

  it.each(["Sync", "This device", "About"])(
    "groups settings under a %s heading",
    (name) => {
      renderSettings();
      expect(screen.getByRole("heading", { name, level: 2 })).toBeDefined();
    },
  );

  it.each([
    ["Sync", "link", /^Account/],
    ["Sync", "link", /^Local network sync/],
    ["This device", "link", /^Dictionaries/],
    ["About", "button", /^Help/],
  ] as const)(
    "puts in the %s group the %s row named %s",
    (group, role, name) => {
      renderSettings();
      expect(getGroup(group).getByRole(role, { name })).toBeDefined();
    },
  );

  it.each([
    ["This device", "Display"],
    ["This device", "Subtitles"],
    ["This device", "Media conversion"],
    ["About", "Open-source licenses"],
  ])("puts in the %s group the %s section", (group, name) => {
    renderSettings();
    expect(getGroup(group).getByRole("region", { name })).toBeDefined();
  });

  it("puts the desktop app's Server row in the Sync group", () => {
    renderWithAppStore(<SettingsScreen backHref="/" />, undefined, {
      server: {
        serverUrl: "http://127.0.0.1:5000",
        token: "t",
        bundledIn: "desktop",
      },
    });
    expect(
      getGroup("Sync").getByRole("link", { name: /^Server/ }),
    ).toBeDefined();
  });

  it("opens the Local network sync page from its row", () => {
    const { store } = renderSettings();
    act(() => {
      store.dispatch(actions.navigated({ type: "openSettings" }));
    });
    fireEvent.click(screen.getByRole("link", { name: /^Local network sync/ }));
    expect(selectRoute(store.getState())).toMatchObject({
      pages: ["general", "pairing"],
    });
  });

  it("opens the Server page from its row on the desktop app", () => {
    const { store } = renderWithAppStore(
      <SettingsScreen backHref="/" />,
      undefined,
      {
        server: {
          serverUrl: "http://127.0.0.1:5000",
          token: "t",
          bundledIn: "desktop",
        },
      },
    );
    act(() => {
      store.dispatch(actions.navigated({ type: "openSettings" }));
    });
    fireEvent.click(screen.getByRole("link", { name: /^Server/ }));
    expect(selectRoute(store.getState())).toMatchObject({
      pages: ["general", "server"],
    });
  });

  it("requests the help link when Help is clicked", () => {
    const { effects } = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /^Help/ }));
    expect(effects.calls).toContainEqual({
      type: "openExternalUrl",
      url: "https://github.com/justinsilvestre/easyimmerse",
    });
  });

  it("shows the theme control in the Display section", () => {
    renderSettings();
    expect(
      within(screen.getByRole("region", { name: "Display" })).getByRole(
        "group",
        { name: "Theme" },
      ),
    ).toBeDefined();
  });

  describe("in its Suggestions section", () => {
    it("disables showing suggestions again while none is dismissed", () => {
      renderSettings();
      expect(
        screen.getByRole<HTMLButtonElement>("button", { name: showAgainName })
          .disabled,
      ).toBe(true);
    });

    it("shows a dismissed suggestion again", () => {
      const { store } = renderSettings();
      act(() => {
        store.dispatch(actions.suggestionDismissed("backup"));
      });
      fireEvent.click(screen.getByRole("button", { name: showAgainName }));
      expect(selectIsSuggestionDismissed("backup")(store.getState())).toBe(
        false,
      );
    });

    it("sits in the This device group", () => {
      renderSettings();
      expect(
        getGroup("This device").getByRole("region", { name: "Suggestions" }),
      ).toBeDefined();
    });
  });
});
