import { actions } from "@easyimmerse/state";
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { AccountSection } from "./AccountSection.tsx";

afterEach(cleanup);

const cloudUrl = "https://cloud.example.com";

/** Renders the section offline beside the official server, as the app opens with a confirmation link. */
function openConfirmationLink() {
  const rendered = renderWithAppStore(<AccountSection />, undefined, {
    cloudUrl,
  });
  act(() => {
    rendered.store.dispatch(
      actions.mailedLinkOpened({ kind: "confirmEmail", token: "t1" }),
    );
  });
  return rendered;
}

describe("EmailConfirmationByLink", () => {
  it("confirms the address on the official server", () => {
    const { effects } = openConfirmationLink();
    expect(effects.calls).toContainEqual({
      type: "confirmEmail",
      serverUrl: cloudUrl,
      token: "t1",
    });
  });

  it("tells that the address is confirmed", async () => {
    const { effects } = openConfirmationLink();
    await act(async () =>
      effects.resolveEmailConfirmation({ ok: true, data: null }),
    );
    expect(screen.getByRole("status").textContent).toBe(
      "Your email address is confirmed.",
    );
  });

  it("tells when the link no longer works", async () => {
    const { effects } = openConfirmationLink();
    await act(async () =>
      effects.resolveEmailConfirmation({
        ok: false,
        error: { status: 400, code: "invalid_link", message: "" },
      }),
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "This confirmation link is no longer valid. You can ask for a new one after logging in.",
    );
  });

  it("opens the Account settings", () => {
    const { store } = openConfirmationLink();
    expect(store.getState().app.route.screen).toBe("settings");
  });
});
