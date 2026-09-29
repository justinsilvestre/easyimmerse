import "@easyimmerse/client/styles.css";
import { registerSW } from "virtual:pwa-register";
import { startApp } from "@easyimmerse/client/startApp";
import { webEffectsRunners } from "./webEffectsRunners.ts";

registerSW({ immediate: true });
startApp("web", webEffectsRunners);
