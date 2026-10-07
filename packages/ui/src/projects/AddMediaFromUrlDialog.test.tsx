import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AddMediaFromUrlDialog } from "./AddMediaFromUrlDialog.tsx";
import {
  exampleFailedJob,
  exampleMediaDescription,
  exampleRunningJob,
} from "./exampleMediaSourceJob.ts";

afterEach(cleanup);

const idle = { isLooking: false, description: null, error: null };
const found = { ...idle, description: exampleMediaDescription };
const languages = { target: "ja", translation: "en" };

function renderDialog(
  props: Partial<Parameters<typeof AddMediaFromUrlDialog>[0]> = {},
) {
  const lookedUp: [string, string][] = [];
  const added: [string, string, string[]][] = [];
  render(
    <AddMediaFromUrlDialog
      sources={[{ name: "video-site" }]}
      languages={languages}
      lookup={idle}
      isStarting={false}
      job={null}
      error={null}
      onLookUp={(source, locator) => lookedUp.push([source, locator])}
      onAdd={(source, locator, subtitles) =>
        added.push([source, locator, subtitles])
      }
      onCancel={() => undefined}
      {...props}
    />,
  );
  return { lookedUp, added };
}

const typeLocator = (value: string) =>
  fireEvent.change(screen.getByLabelText("URL or ID"), { target: { value } });

const clickLookUp = () =>
  fireEvent.click(screen.getByRole("button", { name: "Look up" }));

const clickAdd = () =>
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

/** Renders the dialog as it is once the typed locator has been looked up. */
function renderLookedUp(
  props: Partial<Parameters<typeof AddMediaFromUrlDialog>[0]> = {},
) {
  const { rerender } = renderWithRerender({ ...props, lookup: idle });
  typeLocator("https://videos.example.com/abc");
  clickLookUp();
  rerender({ ...props, lookup: found });
}

function renderWithRerender(
  props: Partial<Parameters<typeof AddMediaFromUrlDialog>[0]>,
) {
  const lookedUp: [string, string][] = [];
  const added: [string, string, string[]][] = [];
  const element = (
    overrides: Partial<Parameters<typeof AddMediaFromUrlDialog>[0]>,
  ) => (
    <AddMediaFromUrlDialog
      sources={[{ name: "video-site" }]}
      languages={languages}
      lookup={idle}
      isStarting={false}
      job={null}
      error={null}
      onLookUp={(source, locator) => lookedUp.push([source, locator])}
      onAdd={(source, locator, subtitles) =>
        added.push([source, locator, subtitles])
      }
      onCancel={() => undefined}
      {...overrides}
    />
  );
  const { rerender } = render(element(props));
  return {
    lookedUp,
    added,
    rerender: (
      overrides: Partial<Parameters<typeof AddMediaFromUrlDialog>[0]>,
    ) => rerender(element(overrides)),
  };
}

describe("AddMediaFromUrlDialog", () => {
  it("looks up the typed locator through the one source", () => {
    const { lookedUp } = renderDialog();
    typeLocator(" https://videos.example.com/abc ");
    clickLookUp();
    expect(lookedUp).toEqual([
      ["video-site", "https://videos.example.com/abc"],
    ]);
  });

  it("looks up nothing while the locator is empty", () => {
    const { lookedUp } = renderDialog();
    clickLookUp();
    expect(lookedUp).toEqual([]);
  });

  it("offers no adding before the locator is looked up", () => {
    renderDialog();
    typeLocator("https://videos.example.com/abc");
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
  });

  it("looks up through the chosen source when there are several", () => {
    const { lookedUp } = renderDialog({
      sources: [{ name: "video-site" }, { name: "podcasts" }],
    });
    fireEvent.change(screen.getByLabelText("Source"), {
      target: { value: "podcasts" },
    });
    typeLocator("https://example.com/feed");
    clickLookUp();
    expect(lookedUp[0]?.[0]).toBe("podcasts");
  });

  it("offers no source choice when there is one source", () => {
    renderDialog();
    expect(screen.queryByLabelText("Source")).toBeNull();
  });

  it("shows the looked-up media's title", () => {
    renderLookedUp();
    expect(screen.getByText("A walk through the old town")).toBeTruthy();
  });

  it("preselects the first subtitles in each project language", () => {
    renderLookedUp();
    const checked = screen
      .getAllByRole("checkbox")
      .filter((box) => (box as HTMLInputElement).checked)
      .map((box) => box.closest("label")?.textContent);
    expect(checked).toEqual(["Japanese", "English (automatic)"]);
  });

  it("adds the looked-up locator with the chosen subtitles", () => {
    const { added, rerender } = renderWithRerender({});
    typeLocator("https://videos.example.com/abc");
    clickLookUp();
    rerender({ lookup: found });
    fireEvent.click(screen.getByLabelText("Japanese"));
    fireEvent.click(screen.getByLabelText("French (automatic)"));
    clickAdd();
    expect(added).toEqual([
      ["video-site", "https://videos.example.com/abc", ["en", "fr"]],
    ]);
  });

  it("asks to look up again once the locator changes", () => {
    renderLookedUp();
    typeLocator("https://videos.example.com/other");
    expect(screen.getByRole("button", { name: "Look up" })).toBeTruthy();
  });

  it("says that the source is being asked", () => {
    const { rerender } = renderWithRerender({});
    typeLocator("https://videos.example.com/abc");
    clickLookUp();
    rerender({ lookup: { ...idle, isLooking: true } });
    expect(screen.getByRole("status").textContent).toContain(
      "Asking the source",
    );
  });

  it("shows why the locator could not be looked up", () => {
    const { rerender } = renderWithRerender({});
    typeLocator("https://videos.example.com/abc");
    clickLookUp();
    rerender({ lookup: { ...idle, error: "Video unavailable" } });
    expect(screen.getByRole("alert").textContent).toBe("Video unavailable");
  });

  it("adds nothing more while the fetch is being started", () => {
    const { added, rerender } = renderWithRerender({});
    typeLocator("https://videos.example.com/abc");
    clickLookUp();
    rerender({ lookup: found, isStarting: true });
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
