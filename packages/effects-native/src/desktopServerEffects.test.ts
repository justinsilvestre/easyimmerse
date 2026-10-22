import { describe, expect, it, vi } from "vitest";
import {
  createDesktopServerControls,
  desktopServerStatusEvent,
  type Invoke,
  type Listen,
} from "./desktopServerEffects.ts";

const status = {
  state: { kind: "stopped" },
  urls: [],
  lan_reachable: false,
  serves_web_app: false,
  pairing_url: null,
} as const;

function fakeInvoke(answer: Promise<unknown>) {
  return vi.fn((_command: string, _args?: Record<string, unknown>) => answer);
}

function fakeListen() {
  const stop = vi.fn();
  const listen = vi.fn(
    async (_event: string, _handler: (event: { payload: unknown }) => void) =>
      stop,
  );
  return { listen, stop };
}

const neverListen: Listen = async () => () => undefined;

describe("createDesktopServerControls", () => {
  it("saves the settings through the save command", async () => {
    const invoke = fakeInvoke(Promise.resolve(status));
    const settings = {
      bind: "0.0.0.0:8787",
      auth: "launch_token" as const,
      open_signup: false,
      api_only: false,
      autostart: false,
      ffmpeg_dir: null,
      expected_hosts: [],
    };
    await createDesktopServerControls(
      invoke as Invoke,
      neverListen,
    ).saveDesktopServerSettings(settings);
    expect(invoke.mock.calls[0]).toEqual([
      "save_desktop_server_settings",
      { settings },
    ]);
  });

  it("resolves with the status the start command answers", async () => {
    const invoke = fakeInvoke(Promise.resolve(status));
    const controls = createDesktopServerControls(invoke as Invoke, neverListen);
    expect(await controls.startDesktopServer()).toEqual(status);
  });

  it("rejects with the shell's reason as the error's message", async () => {
    const invoke = fakeInvoke(Promise.reject("address already in use"));
    const controls = createDesktopServerControls(invoke as Invoke, neverListen);
    await expect(controls.startDesktopServer()).rejects.toThrow(
      "address already in use",
    );
  });

  it("listens for the status event", () => {
    const { listen } = fakeListen();
    createDesktopServerControls(
      fakeInvoke(Promise.resolve(null)) as Invoke,
      listen as Listen,
    ).subscribeToDesktopServerStatus(() => undefined);
    expect(listen.mock.calls[0]?.[0]).toBe(desktopServerStatusEvent);
  });

  it("calls the listener with each event's status", () => {
    const { listen } = fakeListen();
    const listener = vi.fn();
    createDesktopServerControls(
      fakeInvoke(Promise.resolve(null)) as Invoke,
      listen as Listen,
    ).subscribeToDesktopServerStatus(listener);
    listen.mock.calls[0]?.[1]({ payload: status });
    expect(listener).toHaveBeenCalledWith(status);
  });

  it("stops listening when unsubscribed", async () => {
    const { listen, stop } = fakeListen();
    const unsubscribe = createDesktopServerControls(
      fakeInvoke(Promise.resolve(null)) as Invoke,
      listen as Listen,
    ).subscribeToDesktopServerStatus(() => undefined);
    unsubscribe();
    await Promise.resolve();
    expect(stop).toHaveBeenCalledOnce();
  });
});
