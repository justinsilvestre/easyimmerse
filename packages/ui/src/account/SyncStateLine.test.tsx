import type { SyncLinkState } from "@easyimmerse/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fixtureSyncLink } from "../testSupport/fixtureResponses.ts";
import { SyncStateLine } from "./SyncStateLine.tsx";

afterEach(cleanup);

const renderIn = (state: SyncLinkState) =>
  render(<SyncStateLine link={{ ...fixtureSyncLink, state }} />);

describe("SyncStateLine", () => {
  it("tells that the copy is up to date while idle", () => {
    renderIn({ kind: "idle" });
    expect(screen.getByRole("status").textContent).toBe("Up to date");
  });

  it("tells that it is synchronizing", () => {
    renderIn({ kind: "syncing" });
    expect(screen.getByRole("status").textContent).toBe("Synchronizing…");
  });

  it("names the server it couldn't reach", () => {
    renderIn({ kind: "unreachable", since_ms: 0 });
    expect(screen.getByRole("status").textContent).toBe(
      "Couldn't reach cloud.example.org",
    );
  });

  it("tells that the device was logged out", () => {
    renderIn({ kind: "logged_out" });
    expect(screen.getByRole("status").textContent).toBe("Logged out");
  });

  it("gives the server's reason for refusing", () => {
    renderIn({ kind: "failed", code: "forbidden", message: "Not allowed." });
    expect(screen.getByRole("status").textContent).toBe("Not allowed.");
  });
});
