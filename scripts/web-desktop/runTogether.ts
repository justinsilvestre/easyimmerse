import { type ChildProcess, spawn } from "node:child_process";

export interface ChildCommand {
  command: string;
  args: string[];
  env: Record<string, string>;
}

const stopSignals = ["SIGINT", "SIGTERM"] as const;

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
 * Resolves once every child has exited.
 */
export async function runTogether(
  commands: ChildCommand[],
  cwd: string,
  running: ChildProcess[] = [],
): Promise<void> {
  const children = [
    ...running,
    ...commands.map((command) => spawnChild(command, cwd)),
  ];
  const interrupt = () => interruptAll(children);
  for (const signal of stopSignals) process.on(signal, interrupt);
  const exits = children.map(async (child) => {
    stopOthers(children, await exitCodeOf(child));
  });
  await Promise.all(exits);
  for (const signal of stopSignals) process.off(signal, interrupt);
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

export function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

/** Resolves with the child's exit status, treating an exit by signal as 1. */
function exitCodeOf(child: ChildProcess): Promise<number> {
  if (hasExited(child)) return Promise.resolve(child.exitCode ?? 1);
  return new Promise((resolve) =>
    child.once("exit", (code) => resolve(code ?? 1)),
  );
}
