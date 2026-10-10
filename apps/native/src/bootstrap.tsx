import type { ServerConfig } from "@easyimmerse/backend";
import {
  backendStoreParts,
  configureBackend,
  createHttpBackendClient,
  resolveServerConfig,
} from "@easyimmerse/backend";
import { createNativeEffects } from "@easyimmerse/effects-native";
import { createAppStore, createPlayerRegistry } from "@easyimmerse/state";
import { AppRoot } from "@easyimmerse/ui";
import { createRoot } from "react-dom/client";
import "@easyimmerse/ui/styles.css";

/** Connects to the embedded server the native shell injected, wires the effects and store, and mounts the app. */
export function bootstrap(): void {
  const server = readInjectedServerConfig();
  configureBackend(createHttpBackendClient(server), server);
  const playerRegistry = createPlayerRegistry();
  const effects = createNativeEffects({ playerRegistry, server });
  const store = createAppStore(effects, backendStoreParts);
  createRoot(findRootElement()).render(
    <AppRoot store={store} playerRegistry={playerRegistry} />,
  );
}

function readInjectedServerConfig(): ServerConfig {
  const config = resolveServerConfig();
  if (window.__EASYIMMERSE__ === undefined || config === null) {
    throw new Error(
      "The native shell did not inject window.__EASYIMMERSE__ before the app started.",
    );
  }
  return config;
}

function findRootElement(): HTMLElement {
  const root = document.getElementById("root");
  if (root === null) throw new Error("index.html has no #root element.");
  return root;
}
