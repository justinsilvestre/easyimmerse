import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.tsx";
import { createStubStore } from "./createStubStore.ts";

const serverUrl = "http://localhost:4100";

const responsesBodies: Record<string, unknown> = {
  "/health": { status: "ok", ffmpegVersion: "8.0" },
  "/projects": [
    { id: 1, name: "Dark", targetLanguage: "de", createdAt: "2026-01-01" },
  ],
};

function stubServer() {
  vi.stubGlobal("fetch", async (request: Request) => {
    const { pathname } = new URL(request.url);
    return Response.json(responsesBodies[pathname]);
  });
}

async function openSystemStatusScreen() {
  const button = screen.getByRole("button", { name: "System status" });
  await userEvent.click(button);
}

afterEach(() => vi.unstubAllGlobals());

describe("App", () => {
  describe("when it has started", () => {
    it("shows the home screen", () => {
      render(<App store={createStubStore(null)} />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "easyImmerse",
      );
    });

    it("lists the projects stored on the server", async () => {
      stubServer();
      render(<App store={createStubStore(serverUrl)} />);
      expect(await screen.findByText("Dark")).toBeVisible();
    });
  });

  describe("when the system status screen is opened", () => {
    it("shows the platform", async () => {
      render(<App store={createStubStore(null)} />);
      await openSystemStatusScreen();
      expect(screen.getByTestId("Platform")).toHaveTextContent("web");
    });

    it("shows the version of ffmpeg available to the server", async () => {
      stubServer();
      render(<App store={createStubStore(serverUrl)} />);
      await openSystemStatusScreen();
      expect(await screen.findByTestId("ffmpeg version")).toHaveTextContent(
        "8.0",
      );
    });

    it("shows when no server is available", async () => {
      render(<App store={createStubStore(null)} />);
      await openSystemStatusScreen();
      expect(screen.getByTestId("Server address")).toHaveTextContent("none");
    });
  });
});
