import type { BackendClient } from "@easyimmerse/backend";
import {
  backendStoreParts,
  configureBackend,
  createHttpBackendClient,
  createWasmBackendClient,
  resolveServerConfig,
} from "@easyimmerse/backend";
import { createExtensionEffects } from "@easyimmerse/effects-extension";
import { createAppStore, createPlayerRegistry } from "@easyimmerse/state";
import { AppRoot } from "@easyimmerse/ui";
import { loadOfflineWasm } from "@easyimmerse/wasm";
import wasmUrl from "@easyimmerse/wasm/pkg/easyimmerse_wasm_bg.wasm?url";
import { createRoot } from "react-dom/client";
import "@easyimmerse/ui/styles.css";

/** Wires the backend, effects, and store together and mounts the app in the side panel. */
export async function bootstrap(): Promise<void> {
  configureBackend(await createBackendClient());
  const playerRegistry = createPlayerRegistry();
  const effects = createExtensionEffects({ playerRegistry });
  const store = createAppStore(effects, backendStoreParts);
  createRoot(findRootElement()).render(
    <AppRoot store={store} playerRegistry={playerRegistry} effects={effects} />,
  );
}

async function createBackendClient(): Promise<BackendClient> {
  const config = resolveServerConfig();
  if (config !== null) return createHttpBackendClient(config);
  return createWasmBackendClient(await loadOfflineWasm(wasmUrl));
}

function findRootElement(): HTMLElement {
  const root = document.getElementById("root");
  if (root === null) throw new Error("index.html has no #root element.");
  return root;
}
