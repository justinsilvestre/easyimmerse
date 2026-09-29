import { describe, expect, it } from "vitest";
import { buildApiServer } from "./buildApiServer.ts";
import { openDatabase } from "./database/openDatabase.ts";
import { sourceMigrationsFolder } from "./database/sourceMigrationsFolder.ts";

function buildTestServer() {
  return buildApiServer(openDatabase(":memory:", sourceMigrationsFolder));
}

const newProject = { name: "Dark", targetLanguage: "de" };

describe("API server", () => {
  describe("when asked for a health report", () => {
    it("reports the version of ffmpeg", async () => {
      const server = await buildTestServer();
      const response = await server.inject({ url: "/health" });
      expect(response.json()).toEqual({
        status: "ok",
        ffmpegVersion: expect.any(String),
      });
    });

    it("allows requests from other origins", async () => {
      const server = await buildTestServer();
      const headers = { origin: "tauri://localhost" };
      const response = await server.inject({ url: "/health", headers });
      expect(response.headers["access-control-allow-origin"]).toBe(
        "tauri://localhost",
      );
    });
  });

  describe("when no projects have been created", () => {
    it("lists no projects", async () => {
      const server = await buildTestServer();
      const response = await server.inject({ url: "/projects" });
      expect(response.json()).toEqual([]);
    });
  });

  describe("when a project is created", () => {
    it("responds with the saved project", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "POST",
        url: "/projects",
        body: newProject,
      });
      expect(response.json()).toMatchObject({ id: 1, ...newProject });
    });

    it("lists the project afterwards", async () => {
      const server = await buildTestServer();
      await server.inject({
        method: "POST",
        url: "/projects",
        body: newProject,
      });
      const response = await server.inject({ url: "/projects" });
      expect(response.json()).toMatchObject([newProject]);
    });
  });

  describe("when given an incomplete project", () => {
    it("rejects the request", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "POST",
        url: "/projects",
        body: { name: "Dark" },
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
