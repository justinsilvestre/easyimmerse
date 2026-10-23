import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { AccountSection } from "./AccountSection.tsx";

afterEach(cleanup);

const ownServer = "https://books.example.org";

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Renders the section offline, names the own server, and says the password is forgotten. */
function forgetPassword() {
  const rendered = renderWithAppStore(<AccountSection />);
  type("Server address", ownServer);
  type("Email", "someone@example.com");
  fireEvent.click(
    screen.getByRole("button", { name: "Forgot your password?" }),
  );
  return rendered;
}

/** Says the password is forgotten and lets the server answer whether it sends email. */
async function forgetPasswordOn(sendsEmail: boolean) {
  const rendered = forgetPassword();
  await act(async () =>
    rendered.effects.resolveServerAuthInfo({
      ok: true,
      data: { accounts: true, open_signup: true, sends_email: sendsEmail },
    }),
  );
  return rendered;
}

describe("PasswordResetForm", () => {
  it("asks the server whether it sends email", () => {
    const { effects } = forgetPassword();
    expect(effects.calls).toContainEqual({
      type: "fetchServerAuthInfo",
      serverUrl: ownServer,
    });
  });

  it("opens on a server that sends email", async () => {
    await forgetPasswordOn(true);
    expect(screen.getByRole("form", { name: "Reset password" })).toBeDefined();
  });

  it("heads the page Account rather than Log in", async () => {
    await forgetPasswordOn(true);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Account",
    );
  });

  it("tells that a server without email cannot send a link", async () => {
    await forgetPasswordOn(false);
    expect(screen.getByRole("status").textContent).toBe(
      "This server can't send email. Ask its administrator to set a new password for you.",
    );
  });

  it("asks the server to mail a reset link to the address", async () => {
    const { effects } = await forgetPasswordOn(true);
    fireEvent.click(screen.getByRole("button", { name: "Send a reset link" }));
    expect(effects.calls).toContainEqual({
      type: "requestPasswordReset",
      serverUrl: ownServer,
      email: "someone@example.com",
    });
  });

  it("tells that the link is on its way", async () => {
    const { effects } = await forgetPasswordOn(true);
    fireEvent.click(screen.getByRole("button", { name: "Send a reset link" }));
    await act(async () =>
      effects.resolvePasswordResetRequest({ ok: true, data: null }),
    );
    expect(screen.getByRole("status").textContent).toBe(
      "If that address has an account, a link is on its way. It works for one hour.",
    );
  });

  it("goes back to logging in", async () => {
    await forgetPasswordOn(true);
    fireEvent.click(screen.getByRole("button", { name: "Back to logging in" }));
    expect(screen.getByRole("button", { name: "Log in" })).toBeDefined();
  });
});
