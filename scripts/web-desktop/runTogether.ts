import { type ChildProcess, spawn } from "node:child_process";

export interface ChildCommand {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/** Starts a command with the terminal attached. */
export function spawnChild(command: ChildCommand, cwd: string): ChildProcess {
  return spawn(command.command, command.args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...command.env },
  });
}

/**
 * Runs the commands side by side with the terminal attached, together with any `running` children.
 * When one exits, or this process is asked to stop, the others are interrupted,
 * and this process exits with the status of the first to exit.
 */
export function runTogether(
  commands: ChildCommand[],
  cwd: string,
  running: ChildProcess[] = [],
): void {
  const children = [
    ...running,
    ...commands.map((command) => spawnChild(command, cwd)),
  ];
  for (const child of children) {
    if (hasExited(child)) stopOthers(children, child.exitCode ?? 1);
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

export function interruptAll(children: ChildProcess[]): void {
  for (const child of children) {
    if (!hasExited(child)) child.kill("SIGINT");
  }
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}
