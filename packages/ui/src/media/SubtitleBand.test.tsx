import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubtitleBand } from "./SubtitleBand.tsx";
import {
  defaultSubtitleAppearance,
  type SubtitleAppearance,
} from "./subtitleAppearance.ts";
import type { SubtitleBandPlacement } from "./subtitleBandPlacement.ts";

afterEach(cleanup);

const controlsHeight = 70;

function renderBand(
  placement: SubtitleBandPlacement,
  appearance: SubtitleAppearance | null = {
    ...defaultSubtitleAppearance,
    backgroundOpacity: 60,
  },
) {
  render(
    <SubtitleBand
      placement={placement}
      appearance={appearance}
      controlsHeight={controlsHeight}
    >
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

    it("rises above the controls", () => {
      expect(renderBand("overlay").style.bottom).toBe("70px");
    });

    it("reaches its backdrop down behind the controls", () => {
      renderBand("overlay");
      expect(screen.getByTestId("subtitle-band-foot").style.height).toBe(
        "70px",
      );
    });
  });

  describe("under the picture", () => {
    it("lies on black, like the video", () => {
      expect(renderBand("below").classList.contains("bg-black")).toBe(true);
    });

    it("leaves the controls' place to the stage", () => {
      expect(renderBand("below").style.bottom).toBe("");
    });

    it("ignores the chosen opacity", () => {
      expect(renderBand("below").style.backgroundColor).toBe("");
    });

    it("draws no backdrop without an appearance", () => {
      expect(renderBand("below", null).classList.contains("bg-black")).toBe(
        false,
      );
    });
  });
});
