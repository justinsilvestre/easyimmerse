import { describe, expect, it, vi } from "vitest";
import { createApplyAppearance } from "./applyAppearance.ts";

/** Applies the appearances in turn to a fresh element and returns the element. */
function applied(
  ...appearances: Parameters<ReturnType<typeof createApplyAppearance>>[0][]
) {
  const root = document.createElement("html");
  const applyAppearance = createApplyAppearance(root);
  for (const appearance of appearances) applyAppearance(appearance);
  return root;
}

describe("createApplyAppearance", () => {
  it("marks the root with the theme", () => {
    const root = applied({ theme: "dark", textScale: 100 });
    expect(root.dataset.theme).toBe("dark");
  });

  it("sets the root font size to the text scale", () => {
    const root = applied({ theme: "light", textScale: 125 });
    expect(root.style.fontSize).toBe("125%");
  });

  it("leaves the root font size alone at the default scale", () => {
    const root = applied(
      { theme: "light", textScale: 125 },
      { theme: "light", textScale: 100 },
    );
    expect(root.style.fontSize).toBe("");
  });

  it("leaves theme transitions off for the first appearance", () => {
    const root = applied({ theme: "light", textScale: 100 });
    expect(root.dataset.themeTransitions).toBeUndefined();
  });

  it("turns theme transitions on once the first appearance is painted", async () => {
    const root = applied({ theme: "light", textScale: 100 });
    await vi.waitFor(() => expect(root.dataset.themeTransitions).toBe(""));
  });
});
