import { type ChildProcess, spawn } from "node:child_process";

export interface ChildCommand {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/**
 * Runs the commands side by side with the terminal attached.
 * When one exits, or this process is asked to stop, the others are interrupted,
 * and this process exits with the status of the first to exit.
 */
export function runTogether(commands: ChildCommand[], cwd: string): void {
  const children = commands.map((child) =>
    spawn(child.command, child.args, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, ...child.env },
    }),
  );
  for (const child of children) {
    child.on("exit", (code) => stopOthers(children, code ?? 1));
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => interruptAll(children));
  }
}

function stopOthers(children: ChildProcess[], code: number): void {
  process.exitCode ??= code;
  interruptAll(children);
}

function interruptAll(children: ChildProcess[]): void {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGINT");
    }
  }
}
