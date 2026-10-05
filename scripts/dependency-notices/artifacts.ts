/** The artifacts that ship, as the licenses page names them. */
export type Artifact =
  | "server"
  | "desktop app"
  | "mobile app"
  | "web app"
  | "browser extension";

/** A Rust target that a shipped artifact is built for, and the crates built for it, each with the artifacts it ends up in. */
export interface RustTarget {
  triple: string;
  roots: { crate: string; artifacts: Artifact[] }[];
}

const server = {
  crate: "easyimmerse-server",
  artifacts: ["server"] as Artifact[],
};
const desktopApp = {
  crate: "easyimmerse-native",
  artifacts: ["desktop app"] as Artifact[],
};
const mobileApp = {
  crate: "easyimmerse-native",
  artifacts: ["mobile app"] as Artifact[],
};

const desktopTriples = [
  "aarch64-apple-darwin",
  "x86_64-apple-darwin",
  "aarch64-unknown-linux-gnu",
  "x86_64-unknown-linux-gnu",
  "aarch64-pc-windows-msvc",
  "x86_64-pc-windows-msvc",
];
const mobileTriples = [
  "aarch64-apple-ios",
  "aarch64-linux-android",
  "x86_64-linux-android",
];

/**
 * Every target the release workflows build. The example plugins under `plugins/` are test fixtures and do not ship.
 * The WebAssembly module ships inside both the web app and the browser extension.
 */
export const rustTargets: RustTarget[] = [
  ...desktopTriples.map((triple) => ({ triple, roots: [server, desktopApp] })),
  ...mobileTriples.map((triple) => ({ triple, roots: [mobileApp] })),
  {
    triple: "wasm32-unknown-unknown",
    roots: [
      {
        crate: "easyimmerse-wasm",
        artifacts: ["web app", "browser extension"],
      },
    ],
  },
];

/**
 * A JavaScript bundle: the app whose production dependencies it bundles,
 * and the build-tool packages whose own code the build adds to it, each given as a chain of dependencies from the app.
 * Only the last package of each chain is bundled, not its dependencies.
 */
export interface JavaScriptBundle {
  app: string;
  artifacts: Artifact[];
  buildToolCode: string[][];
}

/** Vite's preload helper and Rolldown's runtime helpers, which every Vite build adds. */
const viteRuntime = (via: string[]) => [
  [...via, "vite"],
  [...via, "vite", "rolldown"],
];
/** Tailwind's base styles, which every stylesheet built with Tailwind starts with. */
const tailwindBase = (via: string[]) => [
  [...via, "@tailwindcss/vite", "tailwindcss"],
];

export const javaScriptBundles: JavaScriptBundle[] = [
  {
    app: "apps/web",
    artifacts: ["web app"],
    buildToolCode: [
      ...viteRuntime(["@easyimmerse/config"]),
      ...tailwindBase(["@easyimmerse/config"]),
      // The service worker that vite-plugin-pwa generates bundles these Workbox modules.
      ...["core", "precaching", "routing", "strategies"].map((module) => [
        "vite-plugin-pwa",
        "workbox-build",
        `workbox-${module}`,
      ]),
    ],
  },
  {
    app: "apps/native",
    artifacts: ["desktop app", "mobile app"],
    buildToolCode: [
      ...viteRuntime(["@easyimmerse/config"]),
      ...tailwindBase(["@easyimmerse/config"]),
    ],
  },
  {
    app: "apps/extension",
    artifacts: ["browser extension"],
    buildToolCode: [
      ["wxt"],
      ["wxt", "@wxt-dev/browser"],
      ...viteRuntime(["wxt"]),
      ...tailwindBase([]),
    ],
  },
];
