import { fileURLToPath } from "node:url";

/** The location of the database migrations when running from the source code. */
export const sourceMigrationsFolder = fileURLToPath(
  new URL("../../drizzle/migrations", import.meta.url),
);
