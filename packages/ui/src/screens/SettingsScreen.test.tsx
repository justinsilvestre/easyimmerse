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
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { SettingsScreen } from "./SettingsScreen.tsx";

afterEach(cleanup);

function renderSettings() {
  return renderWithAppStore(
    <SettingsScreen
      onBack={() => undefined}
      onOpenAccount={() => undefined}
      onOpenDictionaries={() => undefined}
    />,
  );
}

const showAgainName = "Show dismissed suggestions again";

function getGroup(name: string) {
  return within(screen.getByRole("region", { name }));
}

describe("SettingsScreen", () => {
  it("calls onBack when Back is clicked", () => {
    let backCount = 0;
    renderWithAppStore(
      <SettingsScreen
        onBack={() => {
          backCount += 1;
        }}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(backCount).toBe(1);
  });

  it("opens the dictionaries settings from their link", () => {
    let openCount = 0;
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => {
          openCount += 1;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Dictionaries/ }));
    expect(openCount).toBe(1);
  });

  it("opens the account settings screen from its button", () => {
    let openCount = 0;
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => {
          openCount += 1;
        }}
        onOpenDictionaries={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Account/ }));
    expect(openCount).toBe(1);
  });

  it("tells on the account button that the app is logged in to no account", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    expect(screen.getByText(/You are not logged in/)).toBeDefined();
  });

  it("marks the Profile menu's Settings row as the page already open", () => {
    const { store } = renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
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
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    expect(
      within(screen.getByRole("region", { name: "Subtitles" })).getByRole(
        "slider",
        { name: "Background opacity" },
      ),
    ).toBeDefined();
  });

  it("treats conversion as unavailable until told otherwise", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    expect(
      screen.getByText(
        "Media conversion is unavailable, so there is no cache.",
      ),
    ).toBeDefined();
  });

  it("shows the lossless audio toggle in a Media conversion section", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    expect(
      within(
        screen.getByRole("region", { name: "Media conversion" }),
      ).getByRole("checkbox", { name: "Keep audio lossless when converting" }),
    ).toBeDefined();
  });

  it("shows the server settings on the desktop app", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
      undefined,
      {
        server: {
          serverUrl: "http://127.0.0.1:5000",
          token: "t",
          bundledIn: "desktop",
        },
      },
    );
    expect(screen.getByRole("region", { name: "Server" })).toBeDefined();
  });

  it("shows no server settings elsewhere", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
    );
    expect(screen.queryByRole("region", { name: "Server" })).toBeNull();
  });

  it.each(["Sync", "This device", "About"])(
    "groups settings under a %s heading",
    (name) => {
      renderSettings();
      expect(screen.getByRole("heading", { name, level: 2 })).toBeDefined();
    },
  );

  it.each([
    ["Sync", /^Account/],
    ["Sync", /^Local network sync/],
    ["This device", /^Dictionaries/],
    ["About", /^Help/],
  ])("puts in the %s group the %s row", (group, name) => {
    renderSettings();
    expect(getGroup(group).getByRole("button", { name })).toBeDefined();
  });

  it.each([
    ["This device", "Display"],
    ["This device", "Subtitles"],
    ["This device", "Media conversion"],
    ["About", "Open-source licenses"],
  ])("puts in the %s group the %s section", (group, name) => {
    renderSettings();
    expect(getGroup(group).getByRole("region", { name })).toBeDefined();
  });

  it("puts the desktop app's server settings in the Sync group", () => {
    renderWithAppStore(
      <SettingsScreen
        onBack={() => undefined}
        onOpenAccount={() => undefined}
        onOpenDictionaries={() => undefined}
      />,
      undefined,
      {
        server: {
          serverUrl: "http://127.0.0.1:5000",
          token: "t",
          bundledIn: "desktop",
        },
      },
    );
    expect(
      getGroup("Sync").getByRole("region", { name: "Server" }),
    ).toBeDefined();
  });

  it("opens the Local network sync page from its row", () => {
    const { store } = renderSettings();
    act(() => {
      store.dispatch(actions.navigated({ type: "openSettings" }));
    });
    fireEvent.click(
      screen.getByRole("button", { name: /^Local network sync/ }),
    );
    expect(selectRoute(store.getState())).toMatchObject({
      pages: ["general", "pairing"],
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
