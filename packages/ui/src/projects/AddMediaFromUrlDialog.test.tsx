import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AddMediaFromUrlDialog } from "./AddMediaFromUrlDialog.tsx";
import {
  exampleFailedJob,
  exampleRunningJob,
} from "./exampleMediaSourceJob.ts";

afterEach(cleanup);

function renderDialog(
  props: Partial<Parameters<typeof AddMediaFromUrlDialog>[0]> = {},
) {
  const added: [string, string][] = [];
  render(
    <AddMediaFromUrlDialog
      sources={[{ name: "youtube" }]}
      isStarting={false}
      job={null}
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
    typeLocator(" https://youtu.be/abc ");
    clickAdd();
    expect(added).toEqual([["youtube", "https://youtu.be/abc"]]);
  });

  it("adds nothing while the locator is empty", () => {
    const { added } = renderDialog();
    clickAdd();
    expect(added).toEqual([]);
  });

  it("adds through the chosen source when there are several", () => {
    const { added } = renderDialog({
      sources: [{ name: "youtube" }, { name: "podcasts" }],
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

  it("adds nothing more while the fetch is being started", () => {
    const { added } = renderDialog({ isStarting: true });
    typeLocator("https://youtu.be/abc");
    fireEvent.click(screen.getByRole("button", { name: "Adding…" }));
    expect(added).toEqual([]);
  });

  it("shows the running fetch's latest step", () => {
    renderDialog({ job: exampleRunningJob });
    expect(screen.getByRole("status").textContent).toContain(
      "downloading the video and subtitles",
    );
  });

  it("fills the progress bar to the fetch's fraction", () => {
    renderDialog({ job: exampleRunningJob });
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "45",
    );
  });

  it("lists what the plugin and its commands reported", () => {
    renderDialog({ job: exampleRunningJob });
    const lines = screen.getByRole("list", { name: "Log" });
    expect(lines.textContent).toContain("[download]  45.0% of   48.21MiB");
  });

  it("shows why a fetch failed", () => {
    renderDialog({ job: exampleFailedJob });
    expect(screen.getByRole("alert").textContent).toContain("Private video");
  });

  it("opens the log of a failed fetch", () => {
    renderDialog({ job: exampleFailedJob });
    expect(screen.getByText("Log").closest("details")?.open).toBe(true);
  });

  it("shows why a fetch could not be started", () => {
    renderDialog({ error: "The server has no media directory" });
    expect(screen.getByRole("alert").textContent).toBe(
      "The server has no media directory",
    );
  });
});
