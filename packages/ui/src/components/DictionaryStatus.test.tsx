import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DictionaryStatus } from "./DictionaryStatus.tsx";

afterEach(cleanup);

function renderDictionaryStatus(status: "ready" | "missing" | "unknown") {
  const onSetUpDictionaries = vi.fn();
  const { container } = render(
    <DictionaryStatus
      status={status}
      targetLanguage="de"
      onSetUpDictionaries={onSetUpDictionaries}
    />,
  );
  return { container, onSetUpDictionaries };
}

describe("DictionaryStatus", () => {
  describe("when dictionaries are ready", () => {
    it("says so", () => {
      renderDictionaryStatus("ready");
      expect(screen.getByText(/^Dictionaries ready for /)).toBeTruthy();
    });

    it("offers no setup", () => {
      renderDictionaryStatus("ready");
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  describe("when dictionaries are missing", () => {
    it("warns that words cannot be looked up", () => {
      renderDictionaryStatus("missing");
      expect(screen.getByText(/^No dictionaries for /)).toBeTruthy();
    });

    it("sets up dictionaries when the button is clicked", () => {
      const { onSetUpDictionaries } = renderDictionaryStatus("missing");
      fireEvent.click(
        screen.getByRole("button", { name: "Set up dictionaries" }),
      );
      expect(onSetUpDictionaries).toHaveBeenCalled();
    });
  });

  describe("when the status is unknown", () => {
    it("renders nothing", () => {
      const { container } = renderDictionaryStatus("unknown");
      expect(container.innerHTML).toBe("");
    });
  });
});
