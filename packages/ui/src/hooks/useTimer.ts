import { useEffect, useState } from "react";
import { createTimer, type Timer } from "../components/timer.ts";

/** A timer that lives as long as the component, and is cancelled when it unmounts. */
export function useTimer(): Timer {
  const [timer] = useState(createTimer);
  useEffect(() => timer.cancel, [timer]);
  return timer;
}
