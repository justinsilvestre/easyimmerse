import { type ChildProcess, spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";

/**
 * Verifies that the built desktop app works together with its bundled API server.
 * The test starts the app, then waits for the app's user interface to load the list of projects
 * from the server. Lastly, it verifies that the server stops together with the app.
 *
 * The app under test can be chosen through the environment variable `EASYIMMERSE_APP_EXECUTABLE`.
 */

type LogEntry = {
  reqId?: string;
  req?: { url: string };
  res?: { statusCode: number };
};

const buildFolder = "src-tauri/target/release";
const defaultExecutables: Partial<Record<NodeJS.Platform, string>> = {
  darwin: `${buildFolder}/bundle/macos/easyImmerse.app/Contents/MacOS/easyimmerse`,
  linux: `${buildFolder}/easyimmerse`,
  win32: `${buildFolder}/easyimmerse.exe`,
};
const executable =
  process.env.EASYIMMERSE_APP_EXECUTABLE ??
  defaultExecutables[process.platform];
const serverPort = 4180;
const attemptsCount = 120;
const attemptsInterval = 500;

async function startApp(dataFolder: string): Promise<ChildProcess> {
  if (!executable) throw new Error("This platform has no desktop app.");
  const environment = {
    ...process.env,
    EASYIMMERSE_DATA_FOLDER: dataFolder,
    EASYIMMERSE_SERVER_PORT: `${serverPort}`,
  };
  return spawn(executable, { env: environment, stdio: "inherit" });
}

async function readLog(dataFolder: string): Promise<LogEntry[]> {
  const log = await readFile(join(dataFolder, "server.log"), "utf8").catch(
    () => "",
  );
  const lines = log.split("\n").filter((line) => line.trim() !== "");
  return lines.map((line) => JSON.parse(line));
}

/** Tells whether the log shows a successful response to a request for the list of projects. */
function hasServedProjects(log: LogEntry[]): boolean {
  const request = log.find((entry) => entry.req?.url === "/projects");
  return log.some(
    (entry) => entry.reqId === request?.reqId && entry.res?.statusCode === 200,
  );
}

async function isServerRunning(): Promise<boolean> {
  const response = await fetch(`http://127.0.0.1:${serverPort}/health`).catch(
    () => null,
  );
  return response?.ok ?? false;
}

async function waitUntil(description: string, isDone: () => Promise<boolean>) {
  for (let attempt = 0; attempt < attemptsCount; attempt++) {
    if (await isDone()) return console.info(`Passed: ${description}.`);
    await wait(attemptsInterval);
  }
  throw new Error(`Failed: ${description}.`);
}

const dataFolder = await mkdtemp(join(tmpdir(), "easyimmerse-smoke-test-"));
const app = await startApp(dataFolder);

try {
  await waitUntil("the user interface loads data from the server", async () =>
    hasServedProjects(await readLog(dataFolder)),
  );
  app.kill();
  await waitUntil(
    "the server stops together with the app",
    async () => !(await isServerRunning()),
  );
} catch (error) {
  console.error(error);
  console.error("Server log:", await readLog(dataFolder));
  process.exitCode = 1;
} finally {
  app.kill();
}
