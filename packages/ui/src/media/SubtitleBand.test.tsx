import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubtitleBand } from "./SubtitleBand.tsx";
import {
  defaultSubtitleAppearance,
  type SubtitleAppearance,
} from "./subtitleAppearance.ts";
import type { SubtitleBandPlacement } from "./subtitleBandPlacement.ts";

afterEach(cleanup);

function renderBand(
  placement: SubtitleBandPlacement,
  appearance: SubtitleAppearance | null = {
    ...defaultSubtitleAppearance,
    backgroundOpacity: 60,
  },
) {
  render(
    <SubtitleBand placement={placement} appearance={appearance}>
      Subtitles
    </SubtitleBand>,
  );
  return screen.getByTestId("subtitle-band");
}

describe("SubtitleBand", () => {
  describe("over the picture", () => {
    it("lies on a backdrop at the chosen opacity", () => {
      expect(renderBand("overlay").style.backgroundColor).toBe(
        "rgb(0 0 0 / 0.6)",
      );
    });

    it("draws no backdrop without an appearance", () => {
      expect(renderBand("overlay", null).style.backgroundColor).toBe("");
    });
  });

  describe("under the picture", () => {
    it("lies on the surface of the player controls", () => {
      expect(renderBand("below").classList.contains("bg-surface")).toBe(true);
    });

    it("ignores the chosen opacity", () => {
      expect(renderBand("below").style.backgroundColor).toBe("");
    });

    it("draws no backdrop without an appearance", () => {
      expect(renderBand("below", null).classList.contains("bg-surface")).toBe(
        false,
      );
    });
  });
});
