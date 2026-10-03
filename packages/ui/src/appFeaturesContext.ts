import { createContext } from "react";

/** Which optional parts of the app a platform shows. The web build hides the text size control, since browsers zoom. */
export type AppFeatures = { hasTextSizeControl: boolean };

export const defaultAppFeatures: AppFeatures = { hasTextSizeControl: true };

export const AppFeaturesContext =
  createContext<AppFeatures>(defaultAppFeatures);
