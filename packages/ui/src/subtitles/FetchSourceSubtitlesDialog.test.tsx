import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleMediaDescription } from "../projects/exampleMediaSourceJob.ts";
import { FetchSourceSubtitlesDialog } from "./FetchSourceSubtitlesDialog.tsx";

afterEach(cleanup);

function renderDialog(
  props: Partial<Parameters<typeof FetchSourceSubtitlesDialog>[0]> = {},
) {
  const fetched: string[][] = [];
  render(
    <FetchSourceSubtitlesDialog
      subtitles={exampleMediaDescription.subtitles}
      error={null}
      existingNames={[]}
      languages={{ target: "ja", translation: "en" }}
      isFetching={false}
      onFetch={(ids) => fetched.push(ids)}
      onCancel={() => undefined}
      {...props}
    />,
  );
  return { fetched };
}

const clickFetch = () =>
  fireEvent.click(screen.getByRole("button", { name: "Fetch" }));

describe("FetchSourceSubtitlesDialog", () => {
  it("says that the source is being asked while the tracks are unknown", () => {
    renderDialog({ subtitles: null });
    expect(screen.getByRole("status").textContent).toContain(
      "Asking the source",
    );
  });

  it("fetches the preselected tracks in the project languages", () => {
    const { fetched } = renderDialog();
    clickFetch();
    expect(fetched).toEqual([["ja", "en"]]);
  });

  it("preselects nothing the media file already has", () => {
    const { fetched } = renderDialog({ existingNames: ["Japanese"] });
    clickFetch();
    expect(fetched).toEqual([["ja-orig", "en"]]);
  });

  it("marks the tracks the media file already has", () => {
    renderDialog({ existingNames: ["Japanese"] });
    expect(
      screen.getByText("Japanese").closest("label")?.textContent,
    ).toContain("Already added");
  });

  it("fetches what the user chose", () => {
    const { fetched } = renderDialog();
    fireEvent.click(screen.getByLabelText("English (automatic)"));
    fireEvent.click(screen.getByLabelText("French (automatic)"));
    clickFetch();
    expect(fetched).toEqual([["ja", "fr"]]);
  });

  it("fetches nothing while nothing is chosen", () => {
    const { fetched } = renderDialog({
      languages: { target: "de", translation: "it" },
    });
    clickFetch();
    expect(fetched).toEqual([]);
  });

  it("fetches nothing more while a fetch runs", () => {
    const { fetched } = renderDialog({ isFetching: true });
    fireEvent.click(screen.getByRole("button", { name: "Fetching…" }));
    expect(fetched).toEqual([]);
  });

  it("shows why the tracks could not be listed", () => {
    renderDialog({ subtitles: null, error: "The plugin is gone" });
    expect(screen.getByRole("alert").textContent).toBe("The plugin is gone");
  });
});
