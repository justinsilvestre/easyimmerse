import { buildApiServer } from "@easyimmerse/api/buildApiServer";
import { openDatabase } from "@easyimmerse/api/database/openDatabase";
import { readServerOptions } from "./readServerOptions.ts";

const options = readServerOptions(process.argv.slice(2));
const database = openDatabase(options.databasePath, options.migrationsFolder);
const logging = options.logFilePath ? { file: options.logFilePath } : true;
const server = await buildApiServer(database, logging);

await server.listen({ host: options.host, port: options.port });

if (options.stopsWhenInputCloses) {
  process.stdin.on("close", () => process.exit(0)).resume();
}
