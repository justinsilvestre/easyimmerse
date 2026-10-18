import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Switch } from "./Switch.tsx";

afterEach(cleanup);

function renderSwitch(checked: boolean, disabled = false) {
  const changes: boolean[] = [];
  render(
    <Switch
      label="AnkiConnect"
      checked={checked}
      disabled={disabled}
      onChange={(next) => changes.push(next)}
    />,
  );
  return changes;
}

const findSwitch = () => screen.getByRole("switch", { name: "AnkiConnect" });

describe("Switch", () => {
  it("takes its accessible name from accessibleLabel when given", () => {
    render(
      <Switch
        label="On"
        accessibleLabel="AnkiConnect on for this project"
        checked
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("switch", { name: "AnkiConnect on for this project" }),
    ).toBeDefined();
  });

  it("reads as on while checked", () => {
    renderSwitch(true);
    expect(findSwitch().getAttribute("aria-checked")).toBe("true");
  });

  it("reads as off while unchecked", () => {
    renderSwitch(false);
    expect(findSwitch().getAttribute("aria-checked")).toBe("false");
  });

  it("asks to turn off when switched while on", () => {
    const changes = renderSwitch(true);
    fireEvent.click(findSwitch());
    expect(changes).toEqual([false]);
  });

  it("asks to turn on when switched while off", () => {
    const changes = renderSwitch(false);
    fireEvent.click(findSwitch());
    expect(changes).toEqual([true]);
  });

  it("cannot be switched while disabled", () => {
    renderSwitch(true, true);
    expect((findSwitch() as HTMLButtonElement).disabled).toBe(true);
  });
});
