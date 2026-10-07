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
  it("lines the menu up with the start of an icon button when told to", () => {
    render(
      <MenuButton
        label="Actions"
        align="start"
        items={[{ label: "Delete", onSelect: () => undefined }]}
      />,
    );
    openMenu();
    expect(screen.getByRole("menu").classList.contains("left-0")).toBe(true);
  });

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

  it("closes the menu when the pointer presses outside it", () => {
    renderMenu();
    openMenu();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("keeps the menu open when the pointer presses inside it", () => {
    renderMenu();
    openMenu();
    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeDefined();
  });

  it("closes the menu on Escape", () => {
    renderMenu();
    openMenu();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
