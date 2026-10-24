import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
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

/**
 * Presses an element with the pointer as Safari and the macOS desktop app do.
 * They give a pressed button no focus, so the press takes the focus off whatever held it.
 */
function pressWithoutFocusing(element: HTMLElement) {
  fireEvent.pointerDown(element);
  if (fireEvent.mouseDown(element))
    act(() => (document.activeElement as HTMLElement | null)?.blur());
  fireEvent.pointerUp(element);
  fireEvent.mouseUp(element);
  fireEvent.click(element);
}

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

  it("gives its button back the focus on Escape", () => {
    renderMenu();
    openMenu();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Actions" }),
    );
  });

  it("closes the menu when its button is clicked again", () => {
    renderMenu();
    openMenu();
    openMenu();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows a badge in place of the icon", () => {
    render(
      <MenuButton
        label="Playback speed: 1.5×"
        badge="1.5×"
        items={[{ label: "1×", onSelect: () => undefined }]}
      />,
    );
    expect(screen.getByRole("button").textContent).toBe("1.5×");
  });
});

function renderChoices(onSelect: () => void = () => undefined) {
  render(
    <MenuButton
      label="Speed"
      items={["Slow", "Normal", "Fast"].map((label) => ({
        label,
        isSelected: label === "Normal",
        onSelect,
      }))}
    />,
  );
}

const openChoices = () =>
  fireEvent.click(screen.getByRole("button", { name: "Speed" }));

describe("MenuButton with items of which one is selected", () => {
  it("marks the selected item as checked", () => {
    renderChoices();
    openChoices();
    expect(
      screen
        .getByRole("menuitemradio", { name: "Normal" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("marks the other items as unchecked", () => {
    renderChoices();
    openChoices();
    expect(
      screen
        .getByRole("menuitemradio", { name: "Fast" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("runs the chosen item's action", () => {
    let chosen = 0;
    renderChoices(() => {
      chosen += 1;
    });
    openChoices();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Fast" }));
    expect(chosen).toBe(1);
  });

  it("closes the menu after a choice", () => {
    renderChoices();
    openChoices();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Fast" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("focuses the selected item when the menu opens", () => {
    renderChoices();
    openChoices();
    expect(document.activeElement).toBe(
      screen.getByRole("menuitemradio", { name: "Normal" }),
    );
  });
});

describe("MenuButton arrow keys", () => {
  it("move the focus down to the next item", () => {
    renderChoices();
    openChoices();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitemradio", { name: "Fast" }),
    );
  });

  it("move the focus up to the previous item", () => {
    renderChoices();
    openChoices();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitemradio", { name: "Slow" }),
    );
  });

  it("wrap from the last item to the first", () => {
    renderChoices();
    openChoices();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "End" });
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitemradio", { name: "Slow" }),
    );
  });
});

describe("MenuButton pressed with a pointer that does not focus buttons", () => {
  it("runs the action of a chosen item of which one is selected", () => {
    let chosen = 0;
    renderChoices(() => {
      chosen += 1;
    });
    openChoices();
    pressWithoutFocusing(screen.getByRole("menuitemradio", { name: "Fast" }));
    expect(chosen).toBe(1);
  });

  it("runs the action of a checkbox item", () => {
    let toggled = 0;
    render(
      <MenuButton
        label="Options"
        items={[
          {
            label: "Show subtitles",
            isChecked: true,
            onSelect: () => {
              toggled += 1;
            },
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    pressWithoutFocusing(
      screen.getByRole("menuitemcheckbox", { name: "Show subtitles" }),
    );
    expect(toggled).toBe(1);
  });

  it("closes the menu when its button is pressed again", () => {
    renderMenu();
    openMenu();
    pressWithoutFocusing(screen.getByRole("button", { name: "Actions" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
