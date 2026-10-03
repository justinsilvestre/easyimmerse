import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MenuButton } from "./MenuButton.tsx";

afterEach(cleanup);

function renderMenu(onSelect: () => void = () => undefined) {
  render(
    <MenuButton
      label="Actions"
      items={[{ label: "Delete", isDestructive: true, onSelect }]}
    />,
  );
}

const openMenu = () =>
  fireEvent.click(screen.getByRole("button", { name: "Actions" }));

describe("MenuButton", () => {
  it("keeps the menu closed at first", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the menu when clicked", () => {
    renderMenu();
    openMenu();
    expect(screen.getByRole("menuitem", { name: "Delete" })).not.toBeNull();
  });

  it("runs the chosen item's action", () => {
    let chosen = 0;
    renderMenu(() => {
      chosen += 1;
    });
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(chosen).toBe(1);
  });

  it("closes the menu after a choice", () => {
    renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the menu on Escape", () => {
    renderMenu();
    openMenu();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
