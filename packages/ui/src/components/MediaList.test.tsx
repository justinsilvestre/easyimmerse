import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import { MediaList } from "./MediaList.tsx";

afterEach(cleanup);

const videoName = "Dark S01E01 – Geheimnisse.mkv";

function renderMediaList(media = fixtureProject.media) {
  const callbacks = { onOpenMedia: vi.fn(), onRemoveMedia: vi.fn() };
  render(<MediaList media={media} {...callbacks} />);
  return callbacks;
}

function askToRemoveVideo() {
  fireEvent.click(screen.getByRole("button", { name: `Remove ${videoName}` }));
}

describe("MediaList", () => {
  it("renders one item per media file", () => {
    renderMediaList();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("opens the clicked media file", () => {
    const { onOpenMedia } = renderMediaList();
    fireEvent.click(screen.getByRole("button", { name: videoName }));
    expect(onOpenMedia).toHaveBeenCalledWith("media-1");
  });

  it("shows the duration of a media file when it is known", () => {
    renderMediaList();
    expect(screen.getByText(/52:41/)).toBeTruthy();
  });

  it("shows how many subtitle tracks a media file has", () => {
    renderMediaList();
    expect(screen.getByText(/2 subtitle tracks/)).toBeTruthy();
  });

  describe("when the remove control is clicked", () => {
    it("asks for confirmation before removing", () => {
      renderMediaList();
      askToRemoveVideo();
      expect(screen.getByText(/Remove from this project\?/)).toBeTruthy();
    });

    it("does not remove the media file yet", () => {
      const { onRemoveMedia } = renderMediaList();
      askToRemoveVideo();
      expect(onRemoveMedia).not.toHaveBeenCalled();
    });

    it("moves focus to the confirmation", () => {
      renderMediaList();
      askToRemoveVideo();
      expect(document.activeElement?.textContent).toBe("Cancel");
    });

    it("removes the media file once confirmed", () => {
      const { onRemoveMedia } = renderMediaList();
      askToRemoveVideo();
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      expect(onRemoveMedia).toHaveBeenCalledWith("media-1");
    });

    it("keeps the media file when cancelled", () => {
      const { onRemoveMedia } = renderMediaList();
      askToRemoveVideo();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onRemoveMedia).not.toHaveBeenCalled();
    });

    it("restores the remove control when cancelled", () => {
      renderMediaList();
      askToRemoveVideo();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(
        screen.getByRole("button", { name: `Remove ${videoName}` }),
      ).toBeTruthy();
    });

    it("returns focus to the remove control when cancelled", () => {
      renderMediaList();
      askToRemoveVideo();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(document.activeElement?.getAttribute("aria-label")).toBe(
        `Remove ${videoName}`,
      );
    });
  });

  describe("with no media", () => {
    it("explains which kinds of media can be added", () => {
      renderMediaList([]);
      expect(screen.getByText(/video, audio file, or ebook/)).toBeTruthy();
    });
  });
});
