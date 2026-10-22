import type { SyncConflict } from "@easyimmerse/types";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import { requestsTo } from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { SyncConflictsNotice } from "./SyncConflictsNotice.tsx";

afterEach(cleanup);

const conflict = (kept: SyncConflict["kept"]): SyncConflict => ({
  id: kept,
  description: "a flashcard in Spanish practice",
  kept,
  detected_at_ms: 0,
});

function renderNotice(conflicts: SyncConflict[], count = conflicts.length) {
  const client = createBuiltInServerClient(null, {
    "DELETE /sync/conflicts": () => new Promise(() => undefined),
  });
  renderWithAppStore(
    <SyncConflictsNotice conflicts={conflicts} count={count} />,
    client,
    { server: builtInServerOn("desktop") },
  );
  return client;
}

describe("SyncConflictsNotice", () => {
  it("tells when the change made on another device was kept", () => {
    renderNotice([conflict("other_device")]);
    expect(
      screen.getByText(
        "A flashcard in Spanish practice: the change made on another device was kept.",
      ),
    ).toBeDefined();
  });

  it("tells when the change made on this device was kept", () => {
    renderNotice([conflict("this_device")]);
    expect(
      screen.getByText(
        "A flashcard in Spanish practice: the change made on this device was kept.",
      ),
    ).toBeDefined();
  });

  it("tells when a deletion on another device dropped the change made here", () => {
    renderNotice([conflict("deletion")]);
    expect(
      screen.getByText(
        "A flashcard in Spanish practice: it was deleted on another device, so the change made here was dropped.",
      ),
    ).toBeDefined();
  });

  it("counts the conflicts it does not list", () => {
    renderNotice([conflict("deletion")], 21);
    expect(screen.getByText("And 20 more.")).toBeDefined();
  });

  it("asks the built-in server to dismiss the conflicts", async () => {
    const client = renderNotice([conflict("deletion")]);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(
        requestsTo(client.requests, "DELETE", "/sync/conflicts"),
      ).toHaveLength(1),
    );
  });
});
