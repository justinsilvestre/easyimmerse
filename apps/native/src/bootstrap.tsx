import type { NativePlatform } from "@easyimmerse/backend";
import {
  createBackendStoreParts,
  createHttpBackendClient,
  resolveServerConfig,
} from "@easyimmerse/backend";
import { createNativeEffects } from "@easyimmerse/effects-native";
import type { EnhancerComposer, ServerConfig } from "@easyimmerse/state";
import { createAppStore, createPlayerRegistry } from "@easyimmerse/state";
import { AppRoot, definitionMarkdown } from "@easyimmerse/ui";
import { createRoot } from "react-dom/client";
import { compose } from "redux";
import "@easyimmerse/ui/styles.css";

/** Connects to the embedded server the native shell injected, wires the effects and store, and mounts the app. */
export async function bootstrap(): Promise<void> {
  const { server, platform } = readInjectedConfig();
  const playerRegistry = createPlayerRegistry();
  const effects = createNativeEffects({
    playerRegistry,
    server,
    platform,
    writeDefinitionMarkdown: definitionMarkdown,
  });
  const store = createAppStore(
    effects,
    createBackendStoreParts(createHttpBackendClient(server), server),
    await findDevToolsComposer(platform),
  );
  createRoot(findRootElement()).render(
    <AppRoot store={store} playerRegistry={playerRegistry} />,
  );
}

/**
 * Connects the store in development to a Redux DevTools server at localhost:8000, which `mise run devtools` starts.
 * The webview cannot run the browser extension, so the extension's remote monitor shows the store through that server instead.
 */
async function findDevToolsComposer(
  platform: NativePlatform,
): Promise<EnhancerComposer | undefined> {
  if (!import.meta.env.DEV) return undefined;
  const { devToolsEnhancer } = await import("@redux-devtools/remote");
  const enhancer = devToolsEnhancer({
    name: `easyImmerse ${platform}`,
    hostname: "localhost",
    port: 8000,
    realtime: true,
  });
  return (...enhancers) => compose(...enhancers, enhancer);
}

function readInjectedConfig(): {
  server: ServerConfig;
  platform: NativePlatform;
} {
  const injected = window.__EASYIMMERSE__;
  const server = resolveServerConfig();
  if (injected === undefined || server === null) {
    throw new Error(
      "The native shell did not inject window.__EASYIMMERSE__ before the app started.",
    );
  }
  return { server, platform: injected.platform };
}

function findRootElement(): HTMLElement {
  const root = document.getElementById("root");
  if (root === null) throw new Error("index.html has no #root element.");
  return root;
}
