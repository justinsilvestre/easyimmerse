import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { AnkiConnectSetupDialog } from "./AnkiConnectSetupDialog.tsx";

afterEach(cleanup);

function renderDialog() {
  const calls: string[] = [];
  renderWithAppStore(
    <AnkiConnectSetupDialog
      onConnect={() => calls.push("connect")}
      onClose={() => calls.push("close")}
    />,
  );
  return calls;
}

describe("AnkiConnectSetupDialog", () => {
  it("names the code that installs AnkiConnect", () => {
    renderDialog();
    expect(screen.getByText("2055492159")).toBeDefined();
  });

  it("connects when Connect to Anki is pressed", () => {
    const calls = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Connect to Anki" }));
    expect(calls).toEqual(["connect"]);
  });

  it("closes on Cancel", () => {
    const calls = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(calls).toEqual(["close"]);
  });
});
