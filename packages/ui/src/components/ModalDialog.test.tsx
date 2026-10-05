import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ModalDialog } from "./ModalDialog.tsx";

afterEach(cleanup);

/** A button that opens the dialog, as a screen would, so that closing can hand focus back to it. */
function DialogOpener({ onCancel }: { onCancel?: () => void }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {isOpen && (
        <ModalDialog
          title="Choose"
          description="Pick one."
          onCancel={() => {
            onCancel?.();
            setOpen(false);
          }}
        >
          <input aria-label="Name" />
        </ModalDialog>
      )}
    </>
  );
}

function openDialog(onCancel?: () => void) {
  render(<DialogOpener onCancel={onCancel} />);
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("ModalDialog", () => {
  it("starts with focus on the first control of its content, not the close button", () => {
    openDialog();
    expect(document.activeElement).toBe(screen.getByLabelText("Name"));
  });

  it("describes itself with its description", () => {
    openDialog();
    expect(
      screen
        .getByRole("dialog", { name: "Choose" })
        .getAttribute("aria-describedby"),
    ).toBe(screen.getByText("Pick one.").id);
  });

  it("cancels on Escape", () => {
    const calls: string[] = [];
    openDialog(() => calls.push("cancel"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(calls).toEqual(["cancel"]);
  });

  it("returns focus to the control that opened it once it closes", () => {
    const opener = openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.activeElement).toBe(opener);
  });
});
