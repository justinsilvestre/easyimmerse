import { describe, expect, it } from "vitest";
import { readServerOptions } from "./readServerOptions.ts";

describe("readServerOptions", () => {
  describe("when given no arguments", () => {
    it("accepts connections from the same device only", () => {
      expect(readServerOptions([]).host).toBe("127.0.0.1");
    });

    it("finds the migrations of the API package", () => {
      expect(readServerOptions([]).migrationsFolder).toMatch(/migrations$/);
    });
  });

  describe("when given a log file", () => {
    it("reads the path of the log file", () => {
      const options = readServerOptions(["--log-file", "server.log"]);
      expect(options.logFilePath).toBe("server.log");
    });
  });

  describe("when given a port", () => {
    it("reads the port as a number", () => {
      expect(readServerOptions(["--port", "5000"]).port).toBe(5000);
    });
  });

  describe("when given a database path", () => {
    it("reads the database path", () => {
      const options = readServerOptions(["--database", ":memory:"]);
      expect(options.databasePath).toBe(":memory:");
    });
  });
});
