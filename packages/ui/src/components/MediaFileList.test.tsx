import type { MediaFile } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MediaFileList } from "./MediaFileList.tsx";

const episode: MediaFile = {
  id: "m1",
  project_id: "p1",
  name: "episode.mkv",
  source: { kind: "path", path: "/episode.mkv" },
  created_at_ms: 0,
  track_selection_json: null,
};

const noop = () => undefined;

afterEach(cleanup);

describe("MediaFileList", () => {
  it("says when there are no media files", () => {
    render(
      <MediaFileList
        mediaFiles={[]}
        currentMediaFileId={null}
        addPending={false}
        onOpen={noop}
        onAdd={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText("No media files yet.")).toBeDefined();
  });

  it("calls onOpen with the id of a clicked file", () => {
    const opened: string[] = [];
    render(
      <MediaFileList
        mediaFiles={[episode]}
        currentMediaFileId={null}
        addPending={false}
        onOpen={(id) => opened.push(id)}
        onAdd={noop}
        onRemove={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "episode.mkv" }));
    expect(opened).toEqual(["m1"]);
  });

  it("marks the open file as current", () => {
    render(
      <MediaFileList
        mediaFiles={[episode]}
        currentMediaFileId="m1"
        addPending={false}
        onOpen={noop}
        onAdd={noop}
        onRemove={noop}
      />,
    );
    expect(
      screen
        .getByRole("button", { name: "episode.mkv" })
        .getAttribute("aria-current"),
    ).toBe("true");
  });

  it("calls onRemove with the id of the file whose Remove button is clicked", () => {
    const removed: string[] = [];
    render(
      <MediaFileList
        mediaFiles={[episode]}
        currentMediaFileId={null}
        addPending={false}
        onOpen={noop}
        onAdd={noop}
        onRemove={(id) => removed.push(id)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove episode.mkv" }));
    expect(removed).toEqual(["m1"]);
  });

  it("disables Add media while an add is pending", () => {
    render(
      <MediaFileList
        mediaFiles={[]}
        currentMediaFileId={null}
        addPending={true}
        onOpen={noop}
        onAdd={noop}
        onRemove={noop}
      />,
    );
    expect(
      (screen.getByRole("button", { name: "Add media" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
