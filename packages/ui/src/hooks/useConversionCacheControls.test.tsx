import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConversionCacheSection } from "../components/ConversionCacheSection.tsx";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureConversionCacheStatus } from "../testSupport/mediaFixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useConversionCacheControls } from "./useConversionCacheControls.ts";

afterEach(cleanup);

function Probe() {
  return <ConversionCacheSection {...useConversionCacheControls()} />;
}

describe("useConversionCacheControls", () => {
  it("reports a clearing that succeeded", async () => {
    const { store } = renderWithAppStore(
      <Probe />,
      createFakeBackendClient({
        "GET /conversion-cache": fixtureConversionCacheStatus,
        "POST /conversion-cache/clear": fixtureConversionCacheStatus,
      }),
    );
    act(() => store.dispatch(actions.settingsRequested()));
    fireEvent.click(
      await screen.findByRole("button", { name: "Clear media cache" }),
    );
    expect(await screen.findByText("Cleared.")).toBeDefined();
  });
});
