import "@easyimmerse/client/styles.css";
import { startApp } from "@easyimmerse/client/startApp";
import { extensionEffectsRunners } from "./extensionEffectsRunners.ts";

startApp("extension", extensionEffectsRunners);
