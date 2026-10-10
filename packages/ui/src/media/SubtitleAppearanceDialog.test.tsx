import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubtitleAppearanceDialog } from "./SubtitleAppearanceDialog.tsx";
import {
  defaultSubtitleAppearance,
  type SubtitleAppearance,
} from "./subtitleAppearance.ts";

afterEach(cleanup);

function renderDialog(
  appearance: SubtitleAppearance = defaultSubtitleAppearance,
) {
  const changes: SubtitleAppearance[] = [];
  const closings: string[] = [];
  render(
    <SubtitleAppearanceDialog
      appearance={appearance}
      onChange={(changed) => changes.push(changed)}
      onClose={() => closings.push("closed")}
    />,
  );
  return { changes, closings };
}

describe("SubtitleAppearanceDialog", () => {
  it("is titled Subtitle appearance", () => {
    renderDialog();
    expect(
      screen.getByRole("dialog", { name: "Subtitle appearance" }),
    ).toBeDefined();
  });

  it("applies a change at once", () => {
    const { changes } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Heavy" }));
    expect(changes).toEqual([
      { ...defaultSubtitleAppearance, textShadow: "heavy" },
    ]);
  });

  it("restores the defaults", () => {
    const { changes } = renderDialog({
      ...defaultSubtitleAppearance,
      textColor: "black",
    });
    fireEvent.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(changes).toEqual([defaultSubtitleAppearance]);
  });

  it("closes from Done", () => {
    const { closings } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(closings).toEqual(["closed"]);
  });
});
