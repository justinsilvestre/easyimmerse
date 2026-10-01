import type { BackendClient } from "@easyimmerse/backend";
import { backendStoreParts, configureBackend } from "@easyimmerse/backend";
import {
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { PlayerRegistryContext } from "../playerRegistryContext.ts";
import { createFakeBackendClient } from "./createFakeBackendClient.ts";
import { fixtureResponses } from "./fixtureResponses.ts";

/** Builds a fresh store, recording effects, and fake backend, then renders the element inside them. */
export function renderWithAppStore(
  element: ReactNode,
  client: BackendClient = createFakeBackendClient(fixtureResponses),
) {
  const effects = createRecordingEffects();
  configureBackend(client);
  const store = createAppStore(effects, backendStoreParts);
  const playerRegistry = createPlayerRegistry();
  render(
    <Provider store={store}>
      <PlayerRegistryContext value={playerRegistry}>
        {element}
      </PlayerRegistryContext>
    </Provider>,
  );
  return { effects, store, playerRegistry };
}
