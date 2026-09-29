import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

export type Database = ReturnType<typeof drizzle>;

/**
 * Opens the SQLite database at the given path, creating it if needed,
 * and brings its tables up to date.
 *
 * @param databasePath A file path, or `:memory:` for a temporary database.
 */
export function openDatabase(
  databasePath: string,
  migrationsFolder: string,
): Database {
  const database = drizzle(databasePath);
  migrate(database, { migrationsFolder });
  return database;
}
