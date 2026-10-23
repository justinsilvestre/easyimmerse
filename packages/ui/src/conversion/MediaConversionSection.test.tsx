import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { MediaConversionSection } from "./MediaConversionSection.tsx";

afterEach(cleanup);

describe("MediaConversionSection", () => {
  it("keeps the video quality chosen", () => {
    const { effects } = renderWithAppStore(
      <MediaConversionSection ffmpegBuild={null} />,
    );
    fireEvent.change(screen.getByLabelText("Quality of converted video"), {
      target: { value: "best" },
    });
    expect(effects.calls).toContainEqual({
      type: "savePreference",
      key: "videoQuality",
      value: "best",
    });
  });

  it("shows the balanced quality until another is chosen", () => {
    renderWithAppStore(<MediaConversionSection ffmpegBuild={null} />);
    expect(
      (screen.getByLabelText("Quality of converted video") as HTMLSelectElement)
        .value,
    ).toBe("balanced");
  });
});
