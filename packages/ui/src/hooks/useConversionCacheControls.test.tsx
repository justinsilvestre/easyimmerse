import { resetBackend } from "@easyimmerse/backend";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConversionCacheSection } from "../components/ConversionCacheSection.tsx";
import type { FakeResponse } from "../testSupport/createFakeBackendClient.ts";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { fixtureConversionCacheStatus } from "../testSupport/mediaFixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useConversionCacheControls } from "./useConversionCacheControls.ts";

afterEach(() => {
  cleanup();
  resetBackend();
});

function Probe() {
  return <ConversionCacheSection {...useConversionCacheControls()} />;
}

function renderProbe(responses: Record<string, FakeResponse>) {
  return renderWithAppStore(<Probe />, createFakeBackendClient(responses));
}

const statusRoute = { "GET /conversion-cache": fixtureConversionCacheStatus };

const unavailableText =
  "Video conversion is unavailable, so no converted videos are stored.";

describe("useConversionCacheControls", () => {
  it("shows the usage the server reports", async () => {
    renderProbe(statusRoute);
    expect(
      await screen.findByText("Converted videos use 1.2 GB of 5 GB."),
    ).toBeDefined();
  });

  it("shows nothing while the status loads", () => {
    renderProbe(statusRoute);
    expect(screen.queryByText(unavailableText)).toBeNull();
  });

  it("treats conversion as unavailable when the server says so", async () => {
    renderProbe({
      "GET /conversion-cache": fakeFailure({
        status: 503,
        code: "conversion_unavailable",
        message: "this server has no ffmpeg",
      }),
    });
    expect(await screen.findByText(unavailableText)).toBeDefined();
  });

  it("treats conversion as unavailable without a server", async () => {
    renderProbe({
      "GET /conversion-cache": fakeFailure({
        status: "OFFLINE",
        message: "needs a server",
      }),
    });
    expect(await screen.findByText(unavailableText)).toBeDefined();
  });

  it("reports any other failure to read the status", async () => {
    renderProbe({});
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No canned GET /conversion-cache",
    );
  });

  it("reports a clearing that succeeded", async () => {
    renderProbe({
      ...statusRoute,
      "POST /conversion-cache/clear": fixtureConversionCacheStatus,
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Clear converted videos" }),
    );
    expect(await screen.findByText("Cleared.")).toBeDefined();
  });

  it("reports the error of a clearing that failed", async () => {
    renderProbe(statusRoute);
    fireEvent.click(
      await screen.findByRole("button", { name: "Clear converted videos" }),
    );
    expect(
      await screen.findByText("No canned POST /conversion-cache/clear"),
    ).toBeDefined();
  });
});
