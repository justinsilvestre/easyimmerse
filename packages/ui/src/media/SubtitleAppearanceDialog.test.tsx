import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubtitleAppearanceDialog } from "./SubtitleAppearanceDialog.tsx";
import {
  defaultSubtitleAppearance,
  type SubtitleAppearance,
} from "./subtitleAppearance.ts";

afterEach(cleanup);

function renderDialog(
  appearance: SubtitleAppearance = defaultSubtitleAppearance,
) {
  const callbacks = { onChange: vi.fn(), onClose: vi.fn() };
  render(<SubtitleAppearanceDialog appearance={appearance} {...callbacks} />);
  return callbacks;
}

describe("SubtitleAppearanceDialog", () => {
  it("is titled Subtitle appearance", () => {
    renderDialog();
    expect(
      screen.getByRole("dialog", { name: "Subtitle appearance" }),
    ).toBeDefined();
  });

  it("applies a change at once", () => {
    const { onChange } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Heavy" }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSubtitleAppearance,
      textShadow: "heavy",
    });
  });

  it("restores the defaults", () => {
    const { onChange } = renderDialog({
      ...defaultSubtitleAppearance,
      textColor: "black",
    });
    fireEvent.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(onChange).toHaveBeenCalledWith(defaultSubtitleAppearance);
  });

  it("closes from Done", () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
