import type { PluginForm } from "@easyimmerse/types";
import type { RequestFailure } from "../../server/serverRequest.ts";

/**
 * A dialog that shows a plugin's forms one after another: the form last asked for,
 * whether the plugin is answering an action, and why the last request failed.
 */
export type PluginFormWizard = {
  /** The form the plugin last asked for, or null while it is being asked for. */
  form: PluginForm | null;
  /** True while the plugin answers an action. */
  isAwaitingAnswer: boolean;
  /** Why the form could not be shown or the last action failed. */
  error: string | null;
};

/** A dialog just opened, asking the plugin for its first form. */
export const openedPluginForm: PluginFormWizard = {
  form: null,
  isAwaitingAnswer: false,
  error: null,
};

/** Awaits the plugin's answer to an action, clearing the last failure. */
export function stepSent<W extends PluginFormWizard>(wizard: W): W {
  return { ...wizard, isAwaitingAnswer: true, error: null };
}

/** Shows a form the plugin answered with. */
export function formShown<W extends PluginFormWizard>(
  wizard: W,
  form: PluginForm,
): W {
  return { ...wizard, form, isAwaitingAnswer: false, error: null };
}

/** Shows why a request failed, or `fallback` when the failure carries no message. */
export function requestFailed<W extends PluginFormWizard>(
  wizard: W,
  failure: RequestFailure,
  fallback: string,
): W {
  return {
    ...wizard,
    isAwaitingAnswer: false,
    error: failure.message || fallback,
  };
}
