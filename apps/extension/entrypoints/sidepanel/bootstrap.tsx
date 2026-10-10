import type { BackendClient } from "@easyimmerse/backend";
import {
  createBackendStoreParts,
  createHttpBackendClient,
  createWasmBackendClient,
  resolveServerConfig,
} from "@easyimmerse/backend";
import { createExtensionEffects } from "@easyimmerse/effects-extension";
import type { ServerConfig } from "@easyimmerse/state";
import {
  createAppStore,
  createBrowserFileRegistry,
  createPlayerRegistry,
} from "@easyimmerse/state";
import { AppRoot } from "@easyimmerse/ui";
import { loadOfflineWasm } from "@easyimmerse/wasm";
import wasmUrl from "@easyimmerse/wasm/pkg/easyimmerse_wasm_bg.wasm?url";
import { createRoot } from "react-dom/client";
import "@easyimmerse/ui/styles.css";

/** Wires the backend, effects, and store together and mounts the app in the side panel. */
export async function bootstrap(): Promise<void> {
  const server = resolveServerConfig();
  const client = await createBackendClient(server);
  const playerRegistry = createPlayerRegistry();
  const browserFileRegistry = createBrowserFileRegistry<File>();
  const effects = createExtensionEffects({
    playerRegistry,
    browserFileRegistry,
  });
  const store = createAppStore(
    effects,
    createBackendStoreParts(client, server, browserFileRegistry),
  );
  createRoot(findRootElement()).render(
    <AppRoot
      store={store}
      playerRegistry={playerRegistry}
      browserFileRegistry={browserFileRegistry}
    />,
  );
}

async function createBackendClient(
  server: ServerConfig | null,
): Promise<BackendClient> {
  if (server !== null) return createHttpBackendClient(server);
  return createWasmBackendClient(await loadOfflineWasm(wasmUrl));
}

function findRootElement(): HTMLElement {
  const root = document.getElementById("root");
  if (root === null) throw new Error("index.html has no #root element.");
  return root;
}
