import { describe, expect, it } from "vitest";
import { createSaveQueue } from "./saveQueue.ts";

describe("createSaveQueue", () => {
  it("starts a task of a key once the one before it settles", async () => {
    const queue = createSaveQueue();
    const order: string[] = [];
    const { promise: firstHeld, resolve: finishFirst } =
      Promise.withResolvers<void>();
    const first = queue.run(0, async () => {
      order.push("first started");
      await firstHeld;
      order.push("first finished");
    });
    const second = queue.run(0, async () => {
      order.push("second started");
    });
    setTimeout(finishFirst, 0);
    await Promise.all([first, second]);
    expect(order).toEqual([
      "first started",
      "first finished",
      "second started",
    ]);
  });

  it("runs a task after one that failed", async () => {
    const queue = createSaveQueue();
    queue.run(0, () => Promise.reject(new Error("refused"))).catch(() => null);
    expect(await queue.run(0, async () => "saved")).toBe("saved");
  });
});
