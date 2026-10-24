import type { PitchAccent } from "@easyimmerse/types";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PitchAccentView } from "./PitchAccentView.tsx";

afterEach(cleanup);

function renderAccent(reading: string, accent: Partial<PitchAccent>) {
  return render(
    <PitchAccentView
      reading={reading}
      accent={{ position: 0, nasal: [], devoice: [], tags: [], ...accent }}
    />,
  );
}

describe("PitchAccentView", () => {
  it("marks the downstep on the mora after which the pitch drops", () => {
    const { container } = renderAccent("たべる", { position: 2 });
    expect(container.querySelector("[data-downstep]")?.textContent).toBe("べ");
  });

  it("keeps small kana on the mora before them", () => {
    const { container } = renderAccent("きょう", { position: 1 });
    expect(container.querySelector("[data-downstep]")?.textContent).toBe(
      "きょ",
    );
  });

  it("marks a drop onto the following particle on the last mora", () => {
    const { container } = renderAccent("おとこ", { position: 3 });
    expect(container.querySelector("[data-downstep]")?.textContent).toBe("こ");
  });

  it("marks no downstep when the pitch never drops", () => {
    const { container } = renderAccent("さくら", { position: 0 });
    expect(container.querySelector("[data-downstep]")).toBeNull();
  });

  it("marks the high morae", () => {
    const { container } = renderAccent("たべる", { position: 2 });
    expect(
      [...container.querySelectorAll("[data-pitch=H]")].map(
        (mora) => mora.textContent,
      ),
    ).toEqual(["べ"]);
  });

  it("writes the pattern in H and L, with the downstep position", () => {
    const { container } = renderAccent("たべる", { position: 2 });
    expect(container.querySelector(".font-mono")?.textContent).toBe("[2] LHLL");
  });

  it("marks a nasal mora with a semi-voiced mark on its unvoiced kana", () => {
    const { container } = renderAccent("かがみ", { position: 3, nasal: [2] });
    expect(container.textContent?.startsWith("かか゚み")).toBe(true);
  });
});
