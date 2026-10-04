import {
  backendStoreParts,
  configureBackend,
  resetBackend,
} from "@easyimmerse/backend";
import { ffmpegNotices } from "@easyimmerse/licenses";
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
  configureBackend(createFakeBackendClient(responses));
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
  await screen.findByRole("heading", { name: "Alpha" });
}

async function openMediaFile() {
  fireEvent.click(await screen.findByRole("button", { name: "episode.mkv" }));
}

function openSettingsFromFooter() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
}

const findMediaList = () => screen.getByRole("list", { name: "Media" });

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

  it("lists the project's media after a project is opened", async () => {
    renderAppRoot();
    await openProject();
    expect(await screen.findByRole("list", { name: "Media" })).toBeDefined();
  });

  it("shows the media screen after a media file is opened", async () => {
    renderAppRoot();
    await openProject();
    await openMediaFile();
    expect(await screen.findByRole("region", { name: "Player" })).toBeDefined();
  });

  it("returns to the home screen when Projects is clicked", async () => {
    renderAppRoot();
    await openProject();
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
  });

  it("opens the dictionaries over the home screen", async () => {
    renderAppRoot();
    fireEvent.click(screen.getByRole("button", { name: "Dictionaries" }));
    expect(
      await screen.findByRole("heading", { name: "Dictionaries" }),
    ).toBeDefined();
  });

  describe("when Settings opens from the footer", () => {
    it("shows the settings screen", () => {
      renderAppRoot();
      openSettingsFromFooter();
      expect(screen.getByRole("heading", { name: "Settings" })).toBeDefined();
    });

    it("keeps the project screen mounted beneath", async () => {
      renderAppRoot();
      await openProject();
      openSettingsFromFooter();
      expect(findMediaList()).toBeDefined();
    });

    it("makes the project screen inert", async () => {
      renderAppRoot();
      await openProject();
      openSettingsFromFooter();
      expect(findMediaList().closest("[inert]")).not.toBeNull();
    });

    it("restores the player's position when Back is clicked", async () => {
      const { store } = renderAppRoot();
      await openProject();
      await openMediaFile();
      await screen.findByRole("region", { name: "Player" });
      act(() => store.dispatch(actions.playerTimeChanged(61.75)));
      act(() => store.dispatch(actions.playerDurationChanged(120)));
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      clickUsableBack();
      expect(
        (screen.getByRole("slider", { name: "Position" }) as HTMLInputElement)
          .value,
      ).toBe("61750");
    });

    it("lists the ffmpeg license notices", () => {
      renderAppRoot();
      openSettingsFromFooter();
      const first = ffmpegNotices[0]?.title ?? "";
      expect(screen.getByText(first)).toBeDefined();
    });

    it("reports conversion as unavailable when the server cannot convert", async () => {
      renderAppRoot();
      openSettingsFromFooter();
      expect(
        await screen.findByText(
          "Video conversion is unavailable, so no converted videos are stored.",
        ),
      ).toBeDefined();
    });

    it("lets the project screen be used again after Back is clicked", async () => {
      renderAppRoot();
      await openProject();
      openSettingsFromFooter();
      clickUsableBack();
      expect(findMediaList().closest("[inert]")).toBeNull();
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
