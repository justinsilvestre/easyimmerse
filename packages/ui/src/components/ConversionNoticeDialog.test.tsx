import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ConversionNoticeDialog } from "./ConversionNoticeDialog.tsx";

afterEach(cleanup);

function renderDialog() {
  const calls: string[] = [];
  const rendered = renderWithAppStore(
    <ConversionNoticeDialog
      onPlay={() => calls.push("play")}
      onCancel={() => calls.push("cancel")}
    />,
  );
  return { ...rendered, calls };
}

const findDialog = () => screen.getByRole("dialog");
const clickPlay = () =>
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
const toggleDontShowAgain = () =>
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Don't show this again" }),
  );

describe("ConversionNoticeDialog", () => {
  it("is titled as the spec says", () => {
    renderDialog();
    expect(
      screen.getByRole("dialog", {
        name: "This file will be converted as it plays",
      }),
    ).toBeDefined();
  });

  it("explains that the file is converted while it is watched", () => {
    renderDialog();
    expect(findDialog().textContent).toContain("converts it while you watch");
  });

  it("calls onPlay when Play is clicked", () => {
    const { calls } = renderDialog();
    clickPlay();
    expect(calls).toEqual(["play"]);
  });

  it("calls onCancel when Cancel is clicked", () => {
    const { calls } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(calls).toEqual(["cancel"]);
  });

  it("calls onCancel when Escape is pressed", () => {
    const { calls } = renderDialog();
    fireEvent.keyDown(findDialog(), { key: "Escape" });
    expect(calls).toEqual(["cancel"]);
  });

  it("starts with the box ticked", () => {
    renderDialog();
    expect(
      screen.getByRole("checkbox", { name: "Don't show this again" }),
    ).toHaveProperty("checked", true);
  });

  it("stores the dismissal when Play is clicked with the box ticked", () => {
    const { effects } = renderDialog();
    clickPlay();
    expect(effects.preferences.get("conversionNoticeDismissed")).toBe("true");
  });

  it("stores nothing when Play is clicked with the box cleared", () => {
    const { effects } = renderDialog();
    toggleDontShowAgain();
    clickPlay();
    expect(effects.preferences.has("conversionNoticeDismissed")).toBe(false);
  });

  it("stores nothing when the box is ticked but the dialog is cancelled", () => {
    const { effects } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(effects.preferences.has("conversionNoticeDismissed")).toBe(false);
  });

  it("cancels when the close button is clicked", () => {
    const { calls } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(calls).toEqual(["cancel"]);
  });

  it("starts with focus on Play", () => {
    renderDialog();
    expect(document.activeElement?.textContent).toBe("Play");
  });

  it("wraps focus from the last control back to the first on Tab", () => {
    renderDialog();
    fireEvent.keyDown(findDialog(), { key: "Tab" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close" }),
    );
  });
});
