import "@easyimmerse/client/styles.css";
import { startApp } from "@easyimmerse/client/startApp";
import { nativeEffectsRunners } from "./nativeEffectsRunners.ts";
import { readPlatform } from "./readPlatform.ts";

const platform = readPlatform(import.meta.env.TAURI_ENV_PLATFORM);

startApp(platform, nativeEffectsRunners);

// The smoke tests of the mobile apps look for this message in the log of the device.
console.info("easyImmerse has started.");
