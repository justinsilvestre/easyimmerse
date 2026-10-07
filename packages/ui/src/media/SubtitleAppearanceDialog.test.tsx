import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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

const preview = () => screen.getByTestId("subtitle-preview");

const group = (name: string) => screen.getByRole("group", { name });

describe("SubtitleAppearanceDialog", () => {
  it("is titled Subtitle appearance", () => {
    renderDialog();
    expect(
      screen.getByRole("dialog", { name: "Subtitle appearance" }),
    ).toBeDefined();
  });

  it("changes the box color to the one chosen", () => {
    const { onChange } = renderDialog();
    fireEvent.click(
      within(group("Box color")).getByRole("radio", { name: "White" }),
    );
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSubtitleAppearance,
      boxColor: "white",
    });
  });

  it("changes the box opacity", () => {
    const { onChange } = renderDialog();
    fireEvent.change(screen.getByRole("slider", { name: "Box opacity" }), {
      target: { value: "70" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSubtitleAppearance,
      boxOpacity: 70,
    });
  });

  it("changes the text shadow", () => {
    const { onChange } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Strong" }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSubtitleAppearance,
      textShadow: "strong",
    });
  });

  it("changes the text size", () => {
    const { onChange } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "150%" }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSubtitleAppearance,
      textSizeStep: 5,
    });
  });

  it("changes the text color", () => {
    const { onChange } = renderDialog();
    fireEvent.click(
      within(group("Text color")).getByRole("radio", { name: "Yellow" }),
    );
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSubtitleAppearance,
      textColor: "yellow",
    });
  });

  it("checks the current text color", () => {
    renderDialog({ ...defaultSubtitleAppearance, textColor: "black" });
    expect(
      (
        within(group("Text color")).getByRole("radio", {
          name: "Black",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it("previews the box at the chosen opacity", () => {
    renderDialog({ ...defaultSubtitleAppearance, boxOpacity: 0 });
    expect(preview().style.backgroundColor).toBe("rgb(0 0 0 / 0)");
  });

  it("previews the text in the chosen color", () => {
    renderDialog({ ...defaultSubtitleAppearance, textColor: "yellow" });
    expect(preview().style.color).toBe("#fde047");
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
