import type {
  DesktopServerSettings,
  DesktopServerStatus,
} from "@easyimmerse/types";

/** Settings of a server that listens on the local network with the launch token. */
export const lanSettings: DesktopServerSettings = {
  bind: "0.0.0.0:8787",
  auth: "launch_token",
  open_signup: false,
  api_only: false,
  autostart: false,
  ffmpeg_dir: null,
  expected_hosts: [],
  device_name: "Studio iMac",
};

/** The status of a server that other devices on the local network reach. */
export const runningOnLan: DesktopServerStatus = {
  state: { kind: "running" },
  urls: ["http://192.168.1.5:8787"],
  lan_reachable: true,
  serves_web_app: true,
  pairing_url: "http://192.168.1.5:8787",
};

/** The status of a server that is not running. */
export const stopped: DesktopServerStatus = {
  state: { kind: "stopped" },
  urls: [],
  lan_reachable: false,
  serves_web_app: false,
  pairing_url: null,
};
