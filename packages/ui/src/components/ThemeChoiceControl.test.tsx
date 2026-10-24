import { actions, selectTheme, selectThemeChoice } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ThemeChoiceControl } from "./ThemeChoiceControl.tsx";

afterEach(cleanup);

describe("ThemeChoiceControl", () => {
  it("offers the system, light and dark choices", () => {
    renderWithAppStore(<ThemeChoiceControl />);
    expect(
      screen
        .getAllByRole("radio")
        .map((radio) => radio.parentElement?.textContent),
    ).toEqual(["System", "Light", "Dark"]);
  });

  it("follows the system until a theme is chosen", () => {
    renderWithAppStore(<ThemeChoiceControl />);
    expect(screen.getByRole("radio", { name: "System" })).toHaveProperty(
      "checked",
      true,
    );
  });

  it("stores the chosen theme as a preference", () => {
    const { store } = renderWithAppStore(<ThemeChoiceControl />);
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(selectThemeChoice(store.getState())).toBe("dark");
  });

  it("shows the chosen theme", () => {
    const { store } = renderWithAppStore(<ThemeChoiceControl />);
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(selectTheme(store.getState())).toBe("dark");
  });

  it("marks the choice in force", () => {
    const { store } = renderWithAppStore(<ThemeChoiceControl />);
    act(() => {
      store.dispatch(actions.preferenceSet("theme", "light"));
    });
    expect(screen.getByRole("radio", { name: "Light" })).toHaveProperty(
      "checked",
      true,
    );
  });
});
