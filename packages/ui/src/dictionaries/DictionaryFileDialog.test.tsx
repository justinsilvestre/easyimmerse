import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DictionaryFileDialog } from "./DictionaryFileDialog.tsx";

afterEach(cleanup);

describe("DictionaryFileDialog", () => {
  it("chooses a file with the languages picked in it", () => {
    const onChooseFile = vi.fn();
    render(
      <DictionaryFileDialog
        initialLanguages={{ sourceLanguage: "de", targetLanguage: "en" }}
        onChooseFile={onChooseFile}
        onClose={() => undefined}
      />,
    );
    fireEvent.change(screen.getByLabelText("Language of the definitions"), {
      target: { value: "de" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Choose file" }));
    expect(onChooseFile).toHaveBeenCalledWith({
      sourceLanguage: "de",
      targetLanguage: "de",
    });
  });
});
