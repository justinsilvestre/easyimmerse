import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findSubtitles,
  renderMediaScreen,
} from "../testSupport/renderMediaScreen.tsx";

/** How often each text has rendered, by the text. */
const renderCounts = vi.hoisted(() => new Map<string, number>());

vi.mock("../components/ClickableText.tsx", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../components/ClickableText.tsx")>();
  return {
    ...original,
    ClickableText: (props: ComponentProps<typeof original.ClickableText>) => {
      renderCounts.set(props.text, (renderCounts.get(props.text) ?? 0) + 1);
      return <original.ClickableText {...props} />;
    },
  };
});

afterEach(() => {
  cleanup();
  resetBackend();
  renderCounts.clear();
});

describe("MediaScreen renders", () => {
  it("render only the card under the mouse while the mouse moves onto a word and its lookup answers", async () => {
    renderMediaScreen();
    const list = await findSubtitles();
    const card = within(list).getAllByRole("listitem")[1] as HTMLElement;
    renderCounts.clear();
    fireEvent.pointerEnter(within(card).getByRole("button", { name: "dog" }), {
      pointerType: "mouse",
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect([...renderCounts.keys()]).toEqual([
      "The dog wants to eat.\nIt is hungry.",
    ]);
  });
});
