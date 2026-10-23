import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { AccountSection } from "./AccountSection.tsx";

afterEach(cleanup);

const cloudUrl = "https://cloud.example.com";

const session = {
  token: "session-token",
  user: {
    id: "u1",
    email: "someone@example.com",
    role: "library_user",
    created_at_ms: 0,
    email_confirmed_at_ms: 0,
    manages_library: false,
  },
} as const;

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Renders the section offline, opened with a reset link, with the official server known or not, and sends a new password. */
function chooseNewPassword(hasOfficialServer = true) {
  const rendered = renderWithAppStore(
    <AccountSection />,
    undefined,
    hasOfficialServer ? { cloudUrl } : {},
  );
  act(() => {
    rendered.store.dispatch(
      actions.mailedLinkOpened({ kind: "resetPassword", token: "t1" }),
    );
  });
  type("New password", "correct horse battery");
  fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
  return rendered;
}

describe("NewPasswordForm", () => {
  it("sets the new password on the official server", () => {
    const { effects } = chooseNewPassword();
    expect(effects.calls).toContainEqual({
      type: "setNewPassword",
      serverUrl: cloudUrl,
      token: "t1",
      password: "correct horse battery",
    });
  });

  it("connects to the server with the session it opens", async () => {
    const { effects } = chooseNewPassword();
    await act(async () =>
      effects.resolveNewPassword({ ok: true, data: session }),
    );
    expect(effects.calls).toContainEqual({
      type: "connectToServer",
      server: { serverUrl: cloudUrl, token: "session-token" },
    });
  });

  it("tells when the link no longer works", async () => {
    const { effects } = chooseNewPassword();
    await act(async () =>
      effects.resolveNewPassword({
        ok: false,
        error: { status: 400, code: "invalid_link", message: "" },
      }),
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "This link is no longer valid. Ask for a new one from the login form.",
    );
  });

  it("asks for the server's address when the app knows of none", () => {
    chooseNewPassword(false);
    expect(
      screen.getByText("Enter the address of the server that sent the link."),
    ).toBeDefined();
  });
});
