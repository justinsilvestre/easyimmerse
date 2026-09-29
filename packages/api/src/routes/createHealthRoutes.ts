import { readFfmpegVersion } from "@easyimmerse/media/ffmpeg/readFfmpegVersion";
import type { FastifyPluginAsync } from "fastify";
import type { HealthReport } from "../contract.ts";

export function createHealthRoutes(): FastifyPluginAsync {
  return async (server) => {
    server.get("/health", async (): Promise<HealthReport> => {
      return { status: "ok", ffmpegVersion: await readFfmpegVersion() };
    });
  };
}
