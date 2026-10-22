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

const conflict = (
  kept: SyncConflict["kept"],
  names: Partial<SyncConflict> = {},
): SyncConflict => ({
  id: kept,
  description: "the flashcard “fressen”",
  project_name: "German practice",
  media_file_name: null,
  kept,
  detected_at_ms: 0,
  ...names,
});

/** A conflict that only the full list holds. */
const unlistedConflict = conflict("this_device", {
  id: "older",
  description: "the reading position",
});

function renderNotice(conflicts: SyncConflict[], count = conflicts.length) {
  const client = createBuiltInServerClient(null, {
    "DELETE /sync/conflicts": () => new Promise(() => undefined),
    "GET /sync/conflicts": { conflicts: [...conflicts, unlistedConflict] },
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
      screen.getByText("Kept the change made on another device."),
    ).toBeDefined();
  });

  it("tells when the change made on this device was kept", () => {
    renderNotice([conflict("this_device")]);
    expect(
      screen.getByText("Kept the change made on this device."),
    ).toBeDefined();
  });

  it("tells when a deletion on another device dropped the change made here", () => {
    renderNotice([conflict("deletion")]);
    expect(
      screen.getByText(
        "Deleted on another device, so the change made here was dropped.",
      ),
    ).toBeDefined();
  });

  it("names the item each conflict changed", () => {
    renderNotice([conflict("this_device")]);
    expect(screen.getByText("The flashcard “fressen”")).toBeDefined();
  });

  it("heads the conflicts of a project with its name", () => {
    renderNotice([conflict("this_device")]);
    expect(
      screen.getByRole("heading", { name: "German practice" }),
    ).toBeDefined();
  });

  it("heads the conflicts of a media file with its name", () => {
    renderNotice([
      conflict("this_device", { media_file_name: "Der Prozess.epub" }),
    ]);
    expect(
      screen.getByRole("heading", { name: "Der Prozess.epub" }),
    ).toBeDefined();
  });

  it("heads the conflicts of no project as other, beside those of a project", () => {
    renderNotice([
      conflict("this_device"),
      conflict("deletion", { project_name: null }),
    ]);
    expect(screen.getByRole("heading", { name: "Other" })).toBeDefined();
  });

  it("offers to show every conflict when it lists only some", () => {
    renderNotice([conflict("deletion")], 21);
    expect(screen.getByRole("button", { name: "Show all 21" })).toBeDefined();
  });

  it("does not offer to show every conflict when it lists them all", () => {
    renderNotice([conflict("deletion")]);
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  it("shows every conflict once asked", async () => {
    renderNotice([conflict("deletion")], 2);
    fireEvent.click(screen.getByRole("button", { name: "Show all 2" }));
    expect(await screen.findByText("The reading position")).toBeDefined();
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
