import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConversionNotice } from "./ConversionNotice.tsx";

afterEach(cleanup);

function renderNotice() {
  const plays: boolean[] = [];
  let cancelCount = 0;
  render(
    <ConversionNotice
      onPlay={(dontShowAgain) => plays.push(dontShowAgain)}
      onCancel={() => {
        cancelCount += 1;
      }}
    />,
  );
  return { plays, cancelCount: () => cancelCount };
}

const clickButton = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("ConversionNotice", () => {
  it("reports that the notice may show again when Play is clicked", () => {
    const { plays } = renderNotice();
    clickButton("Play");
    expect(plays).toEqual([false]);
  });

  it("reports that the notice should not show again when Play is clicked after ticking the checkbox", () => {
    const { plays } = renderNotice();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Don't show this again" }),
    );
    clickButton("Play");
    expect(plays).toEqual([true]);
  });

  it("cancels when Cancel is clicked", () => {
    const { cancelCount } = renderNotice();
    clickButton("Cancel");
    expect(cancelCount()).toBe(1);
  });

  it("cancels when Escape is pressed", () => {
    const { cancelCount } = renderNotice();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    expect(cancelCount()).toBe(1);
  });

  it("focuses Play when shown", () => {
    renderNotice();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Play" }),
    );
  });

  it("moves focus from Play back to the checkbox when Tab is pressed", () => {
    renderNotice();
    fireEvent.keyDown(screen.getByRole("button", { name: "Play" }), {
      key: "Tab",
    });
    expect(document.activeElement).toBe(
      screen.getByRole("checkbox", { name: "Don't show this again" }),
    );
  });
});
