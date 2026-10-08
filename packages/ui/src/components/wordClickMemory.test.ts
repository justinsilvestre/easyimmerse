import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordHit } from "./useWordGestures.ts";
import { createWordClickMemory } from "./wordClickMemory.ts";

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

function firstClickOn(word: string, input: WordHit["input"] = "mouse") {
  return {
    hit: { word, start: 0, element: document.createElement("span"), input },
    point: { x: 0, y: 0 },
    onDoubleClick: undefined,
  };
}

describe("createWordClickMemory", () => {
  it("returns the remembered first click once", () => {
    const memory = createWordClickMemory();
    memory.remember(firstClickOn("Hund"));
    memory.take();
    expect(memory.take()).toBeNull();
  });

  it("forgets a mouse click once the double-click interval has passed", () => {
    const memory = createWordClickMemory();
    memory.remember(firstClickOn("Hund"));
    vi.advanceTimersByTime(500);
    expect(memory.take()).toBeNull();
  });

  it("keeps a mouse click within the double-click interval", () => {
    const memory = createWordClickMemory();
    memory.remember(firstClickOn("Hund"));
    vi.advanceTimersByTime(450);
    expect(memory.take()?.hit.word).toBe("Hund");
  });

  it("forgets a click when told to, as when a click lands on no word", () => {
    const memory = createWordClickMemory();
    memory.remember(firstClickOn("Hund"));
    memory.forget();
    expect(memory.take()).toBeNull();
  });

  it("keeps the memories of two apps apart", () => {
    const first = createWordClickMemory();
    const second = createWordClickMemory();
    first.remember(firstClickOn("Hund"));
    expect(second.take()).toBeNull();
  });
});
