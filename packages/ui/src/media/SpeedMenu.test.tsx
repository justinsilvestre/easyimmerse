import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SpeedMenu } from "./SpeedMenu.tsx";

afterEach(cleanup);

function renderSpeedMenu(speed = 1) {
  const speedChanges: number[] = [];
  render(
    <SpeedMenu
      speed={speed}
      onSpeedChange={(changed) => speedChanges.push(changed)}
    />,
  );
  return speedChanges;
}

const speedButton = () =>
  screen.getByRole("button", { name: /^Playback speed/ });

describe("SpeedMenu", () => {
  it("shows the current speed on its button", () => {
    renderSpeedMenu(0.75);
    expect(speedButton().textContent).toBe("0.75×");
  });

  it("names the control and the current speed for assistive technology", () => {
    renderSpeedMenu(1.5);
    expect(speedButton().getAttribute("aria-label")).toBe(
      "Playback speed: 1.5×",
    );
  });

  it("tells that its button opens a menu", () => {
    renderSpeedMenu();
    expect(speedButton().getAttribute("aria-haspopup")).toBe("menu");
  });

  it("reports its menu as closed at first", () => {
    renderSpeedMenu();
    expect(speedButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("reports its menu as open once clicked", () => {
    renderSpeedMenu();
    fireEvent.click(speedButton());
    expect(speedButton().getAttribute("aria-expanded")).toBe("true");
  });

  it("offers each speed", () => {
    renderSpeedMenu();
    fireEvent.click(speedButton());
    expect(
      screen.getAllByRole("menuitemradio").map((item) => item.textContent),
    ).toEqual(["0.5×", "0.75×", "1×", "1.25×", "1.5×", "2×"]);
  });

  it("checks the current speed", () => {
    renderSpeedMenu(1.25);
    fireEvent.click(speedButton());
    expect(
      screen
        .getByRole("menuitemradio", { name: "1.25×" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("changes the speed to the one chosen", () => {
    const speedChanges = renderSpeedMenu();
    fireEvent.click(speedButton());
    fireEvent.click(screen.getByRole("menuitemradio", { name: "2×" }));
    expect(speedChanges).toEqual([2]);
  });

  it("closes once a speed is chosen", () => {
    renderSpeedMenu();
    fireEvent.click(speedButton());
    fireEvent.click(screen.getByRole("menuitemradio", { name: "2×" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
