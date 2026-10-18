import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { TranslationPopup } from "./TranslationPopup.tsx";

afterEach(cleanup);

/** A word that shows and hides the translation when clicked, as a held word and the store do in the reader, so that closing can hand focus back to it. */
function PopupOpener() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(!isOpen)}>
        Hund
      </button>
      {isOpen && <TranslationPopup text="The dog sleeps." language="en" />}
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

  it("hands focus back to where it was when it closes", () => {
    const opener = openPopup();
    fireEvent.click(opener);
    expect(document.activeElement).toBe(opener);
  });
});
