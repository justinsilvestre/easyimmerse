import cors from "@fastify/cors";
import fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import type { Database } from "./database/openDatabase.ts";
import { createHealthRoutes } from "./routes/createHealthRoutes.ts";
import { createProjectsRoutes } from "./routes/createProjectsRoutes.ts";

export type ApiServerLogging = FastifyServerOptions["logger"];

/**
 * Creates the server of the easyImmerse API, without starting it.
 * The server accepts requests from any origin, as its clients include
 * desktop apps, mobile apps, and browser extensions.
 *
 * @param logging Whether or how to log requests. By default, nothing is logged.
 */
export async function buildApiServer(
  database: Database,
  logging: ApiServerLogging = false,
): Promise<FastifyInstance> {
  const server = fastify({ logger: logging });
  await server.register(cors, { origin: true });
  await server.register(createHealthRoutes());
  await server.register(createProjectsRoutes(database));
  return server;
}
