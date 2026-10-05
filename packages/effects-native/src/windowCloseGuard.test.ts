import { describe, expect, it } from "vitest";
import {
  type ClosableWindow,
  createWindowCloseGuard,
} from "./windowCloseGuard.ts";

/** A window whose close requests the test makes, recording what the guard does with them. */
function createFakeWindow() {
  let handler: ((event: { preventDefault(): void }) => Promise<void>) | null =
    null;
  const record = { prevented: 0, destroyed: 0 };
  const window: ClosableWindow = {
    onCloseRequested: async (listener) => {
      handler = listener;
      return () => undefined;
    },
    destroy: async () => {
      record.destroyed += 1;
    },
  };
  const requestClose = async () =>
    handler?.({
      preventDefault: () => {
        record.prevented += 1;
      },
    });
  return { window, record, requestClose };
}

describe("createWindowCloseGuard", () => {
  it("holds the window open while a save is pending and the user declines", async () => {
    const { window, record, requestClose } = createFakeWindow();
    createWindowCloseGuard(window, async () => false)(true);
    await requestClose();
    expect(record).toEqual({ prevented: 1, destroyed: 0 });
  });

  it("closes the window when the user confirms", async () => {
    const { window, record, requestClose } = createFakeWindow();
    createWindowCloseGuard(window, async () => true)(true);
    await requestClose();
    expect(record).toEqual({ prevented: 1, destroyed: 1 });
  });

  it("lets the window close while no save is pending", async () => {
    const { window, record, requestClose } = createFakeWindow();
    const guard = createWindowCloseGuard(window, async () => false);
    guard(true);
    guard(false);
    await requestClose();
    expect(record).toEqual({ prevented: 0, destroyed: 0 });
  });
});
