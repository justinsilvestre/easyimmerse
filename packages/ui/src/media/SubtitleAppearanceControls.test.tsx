import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubtitleAppearanceControls } from "./SubtitleAppearanceControls.tsx";
import {
  defaultSubtitleAppearance,
  type SubtitleAppearance,
} from "./subtitleAppearance.ts";

afterEach(cleanup);

function renderControls(
  appearance: SubtitleAppearance = defaultSubtitleAppearance,
) {
  const changes: SubtitleAppearance[] = [];
  render(
    <SubtitleAppearanceControls
      appearance={appearance}
      onChange={(changed) => changes.push(changed)}
    />,
  );
  return changes;
}

const preview = () => screen.getByTestId("subtitle-preview");

const group = (name: string) => screen.getByRole("group", { name });

const checkedIn = (groupName: string) =>
  within(group(groupName))
    .getAllByRole<HTMLInputElement>("radio")
    .find((radio) => radio.checked)
    ?.closest("label")?.textContent;

describe("SubtitleAppearanceControls", () => {
  it("offers a choice of color for the text alone", () => {
    renderControls();
    expect(screen.getAllByRole("group", { name: /color/i })).toHaveLength(1);
  });

  it("changes the background opacity", () => {
    const changes = renderControls();
    fireEvent.change(
      screen.getByRole("slider", { name: "Background opacity" }),
      { target: { value: "70" } },
    );
    expect(changes).toEqual([
      {
        ...defaultSubtitleAppearance,
        backgroundOpacity: 70,
      },
    ]);
  });

  it("changes the text shadow", () => {
    const changes = renderControls();
    fireEvent.click(screen.getByRole("radio", { name: "Heavy" }));
    expect(changes).toEqual([
      {
        ...defaultSubtitleAppearance,
        textShadow: "heavy",
      },
    ]);
  });

  it("changes the text size", () => {
    const changes = renderControls();
    fireEvent.click(screen.getByRole("radio", { name: "150%" }));
    expect(changes).toEqual([
      {
        ...defaultSubtitleAppearance,
        textSizeStep: 4,
      },
    ]);
  });

  it("changes the text color", () => {
    const changes = renderControls();
    fireEvent.click(
      within(group("Text color")).getByRole("radio", { name: "Yellow" }),
    );
    expect(changes).toEqual([
      {
        ...defaultSubtitleAppearance,
        textColor: "yellow",
      },
    ]);
  });

  it("checks the current text color", () => {
    renderControls({ ...defaultSubtitleAppearance, textColor: "black" });
    expect(checkedIn("Text color")).toBe("Black");
  });

  describe("by default", () => {
    it("checks the text size of 100%", () => {
      renderControls();
      expect(checkedIn("Text size")).toBe("100%");
    });

    it("checks the medium text shadow", () => {
      renderControls();
      expect(checkedIn("Text shadow")).toBe("Medium");
    });

    it("sets the background opacity to 25%", () => {
      renderControls();
      expect(
        screen
          .getByRole("slider", { name: "Background opacity" })
          .getAttribute("aria-valuetext"),
      ).toBe("25%");
    });
  });

  it("previews the background at the chosen opacity", () => {
    renderControls({ ...defaultSubtitleAppearance, backgroundOpacity: 0 });
    expect(preview().style.backgroundColor).toBe("rgb(0 0 0 / 0)");
  });

  it("previews the text in the chosen color", () => {
    renderControls({ ...defaultSubtitleAppearance, textColor: "yellow" });
    expect(preview().style.color).toBe("#fde047");
  });

  it("keeps the preview's picture to a small width of its own", () => {
    renderControls();
    expect(screen.getByTestId("subtitle-preview-picture").className).toContain(
      "max-w-xs",
    );
  });
});
