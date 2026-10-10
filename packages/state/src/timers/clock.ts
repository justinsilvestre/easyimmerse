/** Waits on the app's behalf. A handle identifies a started wait so that it can be cleared. */
export type Clock = {
  setTimeout(fire: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

// This package compiles without the DOM's or Node's types, so it declares the two runtime functions it calls, which every platform provides.
declare function setTimeout(fire: () => void, ms: number): unknown;
declare function clearTimeout(handle: unknown): void;

/** The clock of the JavaScript runtime the app runs in. */
export const systemClock: Clock = {
  // Browsers reject the runtime's functions when they are called as methods of another object, so each call goes through an arrow function.
  setTimeout: (fire, ms) => setTimeout(fire, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};
