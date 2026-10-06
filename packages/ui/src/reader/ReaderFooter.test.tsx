import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReaderFooter } from "./ReaderFooter.tsx";

afterEach(cleanup);

const ignore = () => undefined;

function renderFooter(chapterTitleAt: (progress: number) => string | null) {
  render(
    <ReaderFooter
      progress={0}
      pageInfo={null}
      chapterTitle={null}
      chapterStarts={[0]}
      isVisible
      chapterTitleAt={chapterTitleAt}
      onScrub={ignore}
      onReveal={ignore}
    />,
  );
}

describe("ReaderFooter", () => {
  describe("while the slider is dragged", () => {
    it("names the chapter at the slider's position", () => {
      renderFooter(() => "II");
      fireEvent.change(screen.getByRole("slider"), { target: { value: 450 } });
      expect(screen.getByText("II · 45%")).toBeTruthy();
    });

    it("shows only the percentage where the chapter has no title", () => {
      renderFooter(() => null);
      fireEvent.change(screen.getByRole("slider"), { target: { value: 450 } });
      expect(screen.getByText("45%")).toBeTruthy();
    });
  });
});
