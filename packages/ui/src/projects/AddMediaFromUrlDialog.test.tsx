import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AddMediaFromUrlDialog } from "./AddMediaFromUrlDialog.tsx";

afterEach(cleanup);

function renderDialog(
  props: Partial<Parameters<typeof AddMediaFromUrlDialog>[0]> = {},
) {
  const added: [string, string][] = [];
  render(
    <AddMediaFromUrlDialog
      sources={[{ name: "video-site" }]}
      isAdding={false}
      error={null}
      onAdd={(source, locator) => added.push([source, locator])}
      onCancel={() => undefined}
      {...props}
    />,
  );
  return { added };
}

const typeLocator = (value: string) =>
  fireEvent.change(screen.getByLabelText("URL or ID"), { target: { value } });

const clickAdd = () =>
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

describe("AddMediaFromUrlDialog", () => {
  it("adds the typed locator through the one source", () => {
    const { added } = renderDialog();
    typeLocator(" https://videos.example.com/abc ");
    clickAdd();
    expect(added).toEqual([["video-site", "https://videos.example.com/abc"]]);
  });

  it("adds nothing while the locator is empty", () => {
    const { added } = renderDialog();
    clickAdd();
    expect(added).toEqual([]);
  });

  it("adds through the chosen source when there are several", () => {
    const { added } = renderDialog({
      sources: [{ name: "video-site" }, { name: "podcasts" }],
    });
    fireEvent.change(screen.getByLabelText("Source"), {
      target: { value: "podcasts" },
    });
    typeLocator("https://example.com/feed");
    clickAdd();
    expect(added[0]?.[0]).toBe("podcasts");
  });

  it("offers no source choice when there is one source", () => {
    renderDialog();
    expect(screen.queryByLabelText("Source")).toBeNull();
  });

  it("adds nothing more while the media is being fetched", () => {
    const { added } = renderDialog({ isAdding: true });
    typeLocator("https://videos.example.com/abc");
    fireEvent.click(screen.getByRole("button", { name: "Adding…" }));
    expect(added).toEqual([]);
  });

  it("shows why the last attempt failed", () => {
    renderDialog({ error: "The video is private" });
    expect(screen.getByRole("alert").textContent).toBe("The video is private");
  });
});
