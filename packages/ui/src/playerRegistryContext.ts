import type { PlayerRegistry } from "@easyimmerse/state";
import { createContext, useContext } from "react";

export const PlayerRegistryContext = createContext<PlayerRegistry | null>(null);

export function usePlayerRegistry(): PlayerRegistry {
  const registry = useContext(PlayerRegistryContext);
  if (registry === null)
    throw new Error(
      "usePlayerRegistry needs a PlayerRegistryContext provider.",
    );
  return registry;
}
