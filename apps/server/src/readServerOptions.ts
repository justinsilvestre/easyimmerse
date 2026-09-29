import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { sourceMigrationsFolder } from "@easyimmerse/api/database/sourceMigrationsFolder";

export type ServerOptions = {
  host: string;
  port: number;
  databasePath: string;
  migrationsFolder: string;
  /** The file to write the log to. The log is written to the standard output when this is `null`. */
  logFilePath: string | null;
  /**
   * Whether the server stops once its standard input is closed.
   * This lets the server stop together with a program that started it.
   */
  stopsWhenInputCloses: boolean;
};

const optionsDefinitions = {
  host: { type: "string", default: "127.0.0.1" },
  port: { type: "string", default: "4100" },
  database: { type: "string", default: "easyimmerse.sqlite" },
  migrations: { type: "string" },
  "log-file": { type: "string" },
  "stop-when-input-closes": { type: "boolean", default: false },
} as const;

/** Reads the server's options from its command-line arguments. */
export function readServerOptions(
  commandLineArguments: string[],
): ServerOptions {
  const { values } = parseArgs({
    args: commandLineArguments,
    options: optionsDefinitions,
  });
  return {
    host: values.host,
    port: Number(values.port),
    databasePath: values.database,
    migrationsFolder: values.migrations ?? findMigrationsFolder(),
    logFilePath: values["log-file"] ?? null,
    stopsWhenInputCloses: values["stop-when-input-closes"],
  };
}

/**
 * The bundled server is distributed with a migrations folder beside it.
 * When running from the source code, the migrations are read from the API package instead.
 */
function findMigrationsFolder(): string {
  const bundledMigrationsFolder = join(import.meta.dirname, "migrations");
  return existsSync(bundledMigrationsFolder)
    ? bundledMigrationsFolder
    : sourceMigrationsFolder;
}
