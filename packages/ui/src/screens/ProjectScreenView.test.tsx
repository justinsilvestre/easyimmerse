import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import { ProjectScreenView } from "./ProjectScreenView.tsx";

afterEach(cleanup);

function renderProjectScreenView(
  props: Partial<ComponentProps<typeof ProjectScreenView>> = {},
) {
  const callbacks = {
    onBack: vi.fn(),
    onOpenMedia: vi.fn(),
    onAddMedia: vi.fn(),
    onRemoveMedia: vi.fn(),
    onEditSettings: vi.fn(),
    onSetUpDictionaries: vi.fn(),
    onExportAnkiPackage: vi.fn(),
    onSetUpAnkiConnect: vi.fn(),
    onStartReview: vi.fn(),
  };
  render(
    <ProjectScreenView
      project={fixtureProject}
      flashcardCount={12}
      dictionaryStatus="ready"
      {...callbacks}
      {...props}
    />,
  );
  return callbacks;
}

describe("ProjectScreenView", () => {
  it("shows the project name as the page heading", () => {
    renderProjectScreenView();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Dark, season one",
    );
  });

  it("goes back when the back button is clicked", () => {
    const { onBack } = renderProjectScreenView();
    fireEvent.click(screen.getByRole("button", { name: /All projects/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it("edits the settings when Settings is clicked", () => {
    const { onEditSettings } = renderProjectScreenView();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onEditSettings).toHaveBeenCalled();
  });

  it("adds media when Add media is clicked", () => {
    const { onAddMedia } = renderProjectScreenView();
    fireEvent.click(screen.getByRole("button", { name: "Add media" }));
    expect(onAddMedia).toHaveBeenCalled();
  });

  it("opens the clicked media file", () => {
    const { onOpenMedia } = renderProjectScreenView();
    fireEvent.click(
      screen.getByRole("button", { name: "Die Verwandlung.epub" }),
    );
    expect(onOpenMedia).toHaveBeenCalledWith("media-3");
  });

  it("starts a review from the flashcards section", () => {
    const { onStartReview } = renderProjectScreenView();
    fireEvent.click(
      screen.getByRole("button", { name: "Review in easyImmerse" }),
    );
    expect(onStartReview).toHaveBeenCalled();
  });

  it("renders the header actions", () => {
    renderProjectScreenView({ headerActions: <a href="#help">Help</a> });
    expect(screen.getByRole("link", { name: "Help" })).toBeTruthy();
  });

  describe("when dictionaries are missing", () => {
    it("offers to set them up", () => {
      const { onSetUpDictionaries } = renderProjectScreenView({
        dictionaryStatus: "missing",
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Set up dictionaries" }),
      );
      expect(onSetUpDictionaries).toHaveBeenCalled();
    });
  });

  describe("with no media", () => {
    it("explains which kinds of media can be added", () => {
      renderProjectScreenView({ project: { ...fixtureProject, media: [] } });
      expect(screen.getByText(/video, audio file, or ebook/)).toBeTruthy();
    });
  });
});
