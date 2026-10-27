import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/** The event the native shell emits when the operating system opens the app with a link, which the shell then holds for the page to take. */
export const linkOpenedEvent = "link-opened";

type Listen = (event: string, handler: () => void) => Promise<() => void>;

/** Takes the link the native shell holds, or null when it holds none. The shell then holds none until another link opens. */
type TakeOpenedLink = () => Promise<string | null>;

/**
 * Calls the listener with each link the operating system opens the app with:
 * the one held from before the page listened, such as the link that started the app, and each one opened afterwards.
 */
export function subscribeToOpenedLinks(
  listener: (link: string) => void,
): () => void {
  return createOpenedLinkSubscription(listen, () =>
    invoke<string | null>("take_opened_link"),
  )(listener);
}

/** Builds the subscription over the given Tauri `listen` function and command, so tests can supply fakes. */
export function createOpenedLinkSubscription(
  listenFn: Listen,
  takeOpenedLink: TakeOpenedLink,
): (listener: (link: string) => void) => () => void {
  return (listener) => {
    const deliverHeldLink = () => {
      void takeOpenedLink()
        .then((link) => {
          if (link !== null) listener(link);
        })
        .catch(ignoreRefusal);
    };
    const stopListening = listenFn(linkOpenedEvent, deliverHeldLink);
    void stopListening.then(deliverHeldLink);
    return () => {
      void stopListening.then((stop) => stop());
    };
  };
}

/** A shell that refuses the command holds no link to take. */
function ignoreRefusal(): void {}
