import {
  backendStoreParts,
  configureBackend,
  resetBackend,
} from "@easyimmerse/backend";
import {
  actions,
  createAppStore,
  createPlayerRegistry,
  createRecordingEffects,
} from "@easyimmerse/state";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppRoot } from "./AppRoot.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "./testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "./testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "./testSupport/mediaFixtureResponses.ts";

afterEach(() => {
  cleanup();
  resetBackend();
});

/** The fixture server answers every route except the conversion cache, which it lacks like a server without ffmpeg. */
const responses = {
  ...fixtureResponses,
  "GET /conversion-cache": fakeFailure({
    status: 503,
    code: "conversion_unavailable",
    message: "this server has no ffmpeg or no cache directory",
  }),
};

function renderAppRoot() {
  configureBackend(
    createFakeBackendClient(responses, directPlaybackRoutes),
    fakeServer,
  );
  const effects = createRecordingEffects();
  const playerRegistry = createPlayerRegistry();
  const store = createAppStore(effects, backendStoreParts);
  render(
    <AppRoot store={store} playerRegistry={playerRegistry} effects={effects} />,
  );
  return { effects, playerRegistry, store };
}

async function openProject() {
  fireEvent.click(await screen.findByRole("button", { name: /Alpha/ }));
}

async function openMediaFile() {
  await openProject();
  fireEvent.click(
    await screen.findByRole("button", { name: "Video episode.mkv" }),
  );
  await screen.findByRole("region", { name: "Player" });
}

/** The app's Settings button: the footer's, or the media screen's header button. */
function openSettingsFromFooter() {
  const buttons = screen.getAllByRole("button", { name: "Settings" });
  fireEvent.click(buttons.at(-1) as HTMLElement);
}

const findPlayer = () => screen.getByRole("region", { name: "Player" });

/** The Back button a person can use: the one outside any inert screen beneath Settings. */
function clickUsableBack() {
  const usable = screen
    .getAllByRole("button", { name: "Back" })
    .filter((button) => button.closest("[inert]") === null);
  fireEvent.click(usable[0] as HTMLElement);
}

describe("AppRoot", () => {
  it("starts on the home screen", () => {
    renderAppRoot();
    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
  });

  it("shows the project screen after a project is opened", async () => {
    renderAppRoot();
    await openProject();
    expect(await screen.findByRole("heading", { name: "Alpha" })).toBeDefined();
  });

  it("returns to the home screen when Projects is clicked", async () => {
    renderAppRoot();
    await openProject();
    fireEvent.click(await screen.findByRole("button", { name: "Projects" }));
    expect(
      await screen.findByRole("heading", { name: "Projects" }),
    ).toBeDefined();
  });

  it("shows the media screen once a media file is opened", async () => {
    renderAppRoot();
    await openMediaFile();
    expect(findPlayer()).toBeDefined();
  });

  it("opens the new project form from the home screen", async () => {
    renderAppRoot();
    fireEvent.click(await screen.findByRole("button", { name: "New project" }));
    expect(
      await screen.findByRole("heading", { name: "New project" }),
    ).toBeDefined();
  });

  describe("when Settings opens from the footer", () => {
    it("shows the settings screen", () => {
      renderAppRoot();
      openSettingsFromFooter();
      expect(screen.getByRole("heading", { name: "Settings" })).toBeDefined();
    });

    it("keeps the media screen mounted beneath", async () => {
      renderAppRoot();
      await openMediaFile();
      openSettingsFromFooter();
      expect(findPlayer()).toBeDefined();
    });

    it("makes the media screen inert", async () => {
      renderAppRoot();
      await openMediaFile();
      openSettingsFromFooter();
      expect(findPlayer().closest("[inert]")).not.toBeNull();
    });

    it("restores the player's state when Back is clicked", async () => {
      const { store } = renderAppRoot();
      await openMediaFile();
      act(() => store.dispatch(actions.playerTimeChanged(6.5)));
      openSettingsFromFooter();
      clickUsableBack();
      expect(
        (screen.getByRole("slider", { name: "Position" }) as HTMLInputElement)
          .value,
      ).toBe("6500");
    });

    it("lists the groups of license notices once they load", async () => {
      renderAppRoot();
      openSettingsFromFooter();
      expect(await screen.findByText("Rust crates")).toBeDefined();
    });

    it("reports conversion as unavailable when the server cannot convert", async () => {
      renderAppRoot();
      openSettingsFromFooter();
      expect(
        await screen.findByText(
          "Media conversion is unavailable, so there is no cache.",
        ),
      ).toBeDefined();
    });

    it("lets the media screen be used again after Back is clicked", async () => {
      renderAppRoot();
      await openMediaFile();
      openSettingsFromFooter();
      clickUsableBack();
      expect(findPlayer().closest("[inert]")).toBeNull();
    });
  });

  it("loads the stored preferences at start-up", () => {
    const { effects } = renderAppRoot();
    expect(effects.calls).toContainEqual({
      type: "loadPreference",
      key: "losslessAudio",
    });
  });

  it("opens Settings when the platform asks for it", () => {
    const { effects } = renderAppRoot();
    act(() => effects.requestSettings());
    expect(screen.getByRole("heading", { name: "Settings" })).toBeDefined();
  });
});
