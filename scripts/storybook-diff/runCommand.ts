import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

/** Runs a command with the terminal attached and fails when it exits with a non-zero status. */
export function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

/** Runs a command and returns its trimmed standard output. */
export async function readCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<string> {
  const { stdout } = await promisify(execFile)(command, args, { cwd });
  return stdout.trim();
}
