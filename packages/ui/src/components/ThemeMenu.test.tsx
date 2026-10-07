import { actions, selectTheme, selectThemeChoice } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ThemeMenu } from "./ThemeMenu.tsx";

afterEach(cleanup);

const openMenu = () =>
  fireEvent.click(screen.getByRole("button", { name: /^Theme:/ }));

describe("ThemeMenu", () => {
  it("follows the system until a theme is chosen", () => {
    renderWithAppStore(<ThemeMenu />);
    expect(
      screen.getByRole("button", { name: "Theme: Follow the system" }),
    ).toBeDefined();
  });

  it("offers the system, light and dark choices", () => {
    renderWithAppStore(<ThemeMenu />);
    openMenu();
    expect(
      screen.getAllByRole("menuitemcheckbox").map((item) => item.textContent),
    ).toEqual(["Follow the system", "Light", "Dark"]);
  });

  it("stores the chosen theme as a preference", () => {
    const { store } = renderWithAppStore(<ThemeMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Dark" }));
    expect(selectThemeChoice(store.getState())).toBe("dark");
  });

  it("shows the chosen theme", () => {
    const { store } = renderWithAppStore(<ThemeMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Dark" }));
    expect(selectTheme(store.getState())).toBe("dark");
  });

  it("closes the menu once a theme is chosen", () => {
    renderWithAppStore(<ThemeMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Light" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("names the choice in force on its button", () => {
    const { store } = renderWithAppStore(<ThemeMenu />);
    act(() => {
      store.dispatch(actions.preferenceSet("theme", "light"));
    });
    expect(screen.getByRole("button", { name: "Theme: Light" })).toBeDefined();
  });
});
