import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TestStoreProvider } from "../testSupport/TestStoreProvider.tsx";
import { ConversionNoticeDialog } from "./ConversionNoticeDialog.tsx";

afterEach(cleanup);

function renderDialog(dismissForGood = true) {
  const calls: string[] = [];
  render(
    <ConversionNoticeDialog
      dismissForGood={dismissForGood}
      onDismissForGoodToggle={() => calls.push("toggle")}
      onPlay={() => calls.push("play")}
      onCancel={() => calls.push("cancel")}
    />,
    { wrapper: TestStoreProvider },
  );
  return { calls };
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

  it("shows the box ticked when the dismissal is wanted", () => {
    renderDialog(true);
    expect(
      screen.getByRole("checkbox", { name: "Don't show this again" }),
    ).toHaveProperty("checked", true);
  });

  it("shows the box cleared when the dismissal is not wanted", () => {
    renderDialog(false);
    expect(
      screen.getByRole("checkbox", { name: "Don't show this again" }),
    ).toHaveProperty("checked", false);
  });

  it("calls onDismissForGoodToggle when the box is clicked", () => {
    const { calls } = renderDialog();
    toggleDontShowAgain();
    expect(calls).toEqual(["toggle"]);
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
