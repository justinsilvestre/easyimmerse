import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLicenseNotices } from "./useLicenseNotices.ts";

afterEach(cleanup);

const groups = [{ title: "Rust crates", notices: [] }];

describe("useLicenseNotices", () => {
  it("starts out loading", () => {
    const { result } = renderHook(() =>
      useLicenseNotices(() => new Promise(() => undefined)),
    );
    expect(result.current).toEqual({ status: "loading" });
  });

  it("holds the groups once they load", async () => {
    const load = () => Promise.resolve(groups);
    const { result } = renderHook(() => useLicenseNotices(load));
    await waitFor(() =>
      expect(result.current).toEqual({ status: "loaded", groups }),
    );
  });

  it("reports a failure to load", async () => {
    const load = () => Promise.reject(new Error("offline"));
    const { result } = renderHook(() => useLicenseNotices(load));
    await waitFor(() => expect(result.current).toEqual({ status: "failed" }));
  });
});
