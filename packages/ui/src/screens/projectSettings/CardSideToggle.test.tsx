import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardSideToggle } from "./CardSideToggle.tsx";

afterEach(cleanup);

describe("CardSideToggle", () => {
  it("names the field and the side it is on", () => {
    render(
      <CardSideToggle fieldLabel="Screenshot" isFront onToggle={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Screenshot on the front" }),
    ).not.toBeNull();
  });

  it("shows Back for a field on the back", () => {
    render(
      <CardSideToggle
        fieldLabel="Screenshot"
        isFront={false}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByRole("button").textContent).toBe("Back");
  });

  it("asks to move the field to the other side when pressed", () => {
    const onToggle = vi.fn();
    render(
      <CardSideToggle fieldLabel="Screenshot" isFront onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
