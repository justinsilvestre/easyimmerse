import { selectTheme } from "@easyimmerse/state";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

afterEach(cleanup);

const findSwitch = () => screen.getByRole("switch", { name: "Dark mode" });

describe("ThemeToggle", () => {
  it("is off while the app shows the light theme", () => {
    renderWithAppStore(<ThemeToggle />);
    expect(findSwitch().getAttribute("aria-checked")).toBe("false");
  });

  it("switches the app to the dark theme when clicked", () => {
    const { store } = renderWithAppStore(<ThemeToggle />);
    fireEvent.click(findSwitch());
    expect(selectTheme(store.getState())).toBe("dark");
  });

  it("is on once the app shows the dark theme", () => {
    renderWithAppStore(<ThemeToggle />);
    fireEvent.click(findSwitch());
    expect(findSwitch().getAttribute("aria-checked")).toBe("true");
  });
});
