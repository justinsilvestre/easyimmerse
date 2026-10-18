import type { NativePlatform } from "@easyimmerse/backend";
import {
  createBackendStoreParts,
  createHttpBackendClient,
  resolveServerConfig,
} from "@easyimmerse/backend";
import { createNativeEffects } from "@easyimmerse/effects-native";
import type { ServerConfig } from "@easyimmerse/state";
import { createAppStore, createPlayerRegistry } from "@easyimmerse/state";
import { AppRoot, definitionMarkdown } from "@easyimmerse/ui";
import { createRoot } from "react-dom/client";
import "@easyimmerse/ui/styles.css";

/** Connects to the embedded server the native shell injected, wires the effects and store, and mounts the app. */
export function bootstrap(): void {
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
  );
  createRoot(findRootElement()).render(
    <AppRoot store={store} playerRegistry={playerRegistry} />,
  );
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
