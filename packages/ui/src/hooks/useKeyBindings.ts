import type {
  AppStore,
  KeyBinding,
  KeyPress,
  RootState,
} from "@easyimmerse/state";
import { useEffect, useEffectEvent } from "react";
import { useStore } from "react-redux";
import { keyPressOf } from "./keyPressOf.ts";

type Command = { type: string };

type SelectBinding = (
  app: RootState["app"],
  press: KeyPress,
) => KeyBinding<Command> | null;

/** The commands that a binding selector can give. */
type CommandOf<Binding> = Binding extends {
  kind: "command";
  command: infer Given;
}
  ? Given
  : never;

/** A handler for each command a screen's keys can give, which completes it with data only the screen holds. */
type CommandHandlers<Given extends Command> = {
  [Type in Given["type"]]: (command: Extract<Given, { type: Type }>) => void;
};

/**
 * Listens for keys pressed anywhere on the page, and does what `selectBinding` says each means in the current app state:
 * dispatches its action, or hands its command to the matching handler. A key with no meaning is left to the browser.
 * The focused element sees each key first, so that a key it handles, which it marks by preventing the default, can be told apart.
 */
export function useKeyBindings<Select extends SelectBinding>(
  selectBinding: Select,
  handlers: CommandHandlers<CommandOf<ReturnType<Select>>>,
): void {
  const store = useStore() as AppStore;
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const binding = selectBinding(store.getState().app, keyPressOf(event));
    if (binding === null) return;
    event.preventDefault();
    if (binding.kind === "action") store.dispatch(binding.action);
    else handle(handlers, binding.command);
  });
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}

function handle(handlers: object, command: Command) {
  // Each handler takes only its own command, a link that TypeScript cannot follow through the lookup by type.
  const byType = handlers as Record<string, (given: Command) => void>;
  byType[command.type]?.(command);
}
