import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Builds every Rust example plugin to a component and copies it into that plugin's `dist/`. */
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const pluginNames = ["hello-rust", "hello-loop", "fixture-media-source"];

buildComponents();
for (const name of pluginNames) {
  copyIntoDist(name);
}

function buildComponents() {
  const args = [
    "build",
    "--manifest-path",
    "plugins/Cargo.toml",
    "--release",
    "--target",
    "wasm32-wasip2",
  ];
  execFileSync("cargo", args, { cwd: repoRoot, stdio: "inherit" });
}

function copyIntoDist(name: string) {
  const pluginDir = join(repoRoot, "plugins", name);
  const distDir = join(pluginDir, "dist");
  mkdirSync(distDir, { recursive: true });
  copyFileSync(builtComponentPath(name), join(distDir, "plugin.wasm"));
  copyFileSync(join(pluginDir, "plugin.toml"), join(distDir, "plugin.toml"));
  copyBundledExecutables(pluginDir, distDir);
  printSize(join(distDir, "plugin.wasm"));
  printSize(join(distDir, "plugin.toml"));
}

function copyBundledExecutables(pluginDir: string, distDir: string) {
  const binDir = join(pluginDir, "bin");
  if (!existsSync(binDir)) return;
  cpSync(binDir, join(distDir, "bin"), { recursive: true });
  console.log(`${join(distDir, "bin")} (copied)`);
}

function builtComponentPath(name: string) {
  const crateFileName = `${name.replaceAll("-", "_")}.wasm`;
  return join(
    repoRoot,
    "plugins",
    "target",
    "wasm32-wasip2",
    "release",
    crateFileName,
  );
}

function printSize(path: string) {
  console.log(`${path} (${statSync(path).size} bytes)`);
}
