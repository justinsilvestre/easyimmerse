import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { TranslationPopup } from "./TranslationPopup.tsx";

afterEach(cleanup);

/** A word that opens the translation when clicked, as a held word in the reader does, so that closing can hand focus back to it. */
function PopupOpener() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Hund
      </button>
      {isOpen && (
        <TranslationPopup
          text="The dog sleeps."
          language="en"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function openPopup() {
  render(<PopupOpener />);
  const opener = screen.getByRole("button", { name: "Hund" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("TranslationPopup", () => {
  it("takes focus when it opens", () => {
    openPopup();
    expect(document.activeElement).toBe(
      screen.getByRole("dialog", { name: "Translation" }),
    );
  });

  it("hands focus back to where it was when Escape closes it", () => {
    const opener = openPopup();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(opener);
  });
});
