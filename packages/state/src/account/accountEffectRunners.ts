import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import type { AccountEffect } from "./accountEffect.ts";

/** Performs the account's effects through the platform, and reports each server's answer as an action. */
export const accountEffectRunners = {
  fetchServerAuthInfo: ({ serverUrl }, { effects, dispatch }) => {
    effects
      .fetchServerAuthInfo(serverUrl)
      .then((outcome) =>
        dispatch(
          outcome.ok
            ? actions.serverAuthInfoReceived(serverUrl, outcome.data)
            : actions.signInFailed(outcome.error),
        ),
      );
  },
  createSession: ({ attempt }, { effects, dispatch }) => {
    effects
      .createSession(attempt)
      .then((outcome) =>
        dispatch(
          outcome.ok
            ? actions.signInSucceeded(attempt.serverUrl, outcome.data)
            : actions.signInFailed(outcome.error),
        ),
      );
  },
  connectToServer: ({ server }, { effects, dispatch }) => {
    effects.connectToServer(server).then((outcome) => {
      if (!outcome.ok) dispatch(actions.signInFailed(outcome.error));
    });
  },
  disconnectFromServer: (_effect, { effects }) =>
    effects.disconnectFromServer(),
  requestPasswordReset: ({ serverUrl, email }, { effects, dispatch }) => {
    effects
      .requestPasswordReset(serverUrl, email)
      .then((outcome) => dispatch(actions.passwordResetAnswered(outcome)));
  },
  confirmEmail: ({ serverUrl, token }, { effects, dispatch }) => {
    effects
      .confirmEmail(serverUrl, token)
      .then((outcome) => dispatch(actions.emailConfirmationAnswered(outcome)));
  },
  setNewPassword: ({ serverUrl, token, password }, { effects, dispatch }) => {
    effects
      .setNewPassword(serverUrl, token, password)
      .then((outcome) =>
        dispatch(actions.newPasswordAnswered(serverUrl, outcome)),
      );
  },
} satisfies EffectRunners<AccountEffect>;
