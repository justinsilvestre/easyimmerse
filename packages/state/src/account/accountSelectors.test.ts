import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import {
  selectAccountServerOptions,
  selectCanSubmitSignIn,
  selectIsSigningOut,
  selectPasswordStrength,
  selectSignInForm,
} from "./accountSelectors.ts";

const cloudUrl = "https://cloud.example.com";

const storeWith = (cloud: string | null) =>
  createAppStore(createRecordingEffects(), createFakeServerStoreParts(), cloud);

describe("selectAccountServerOptions", () => {
  it("offers only the person's own server while there is no official one", () => {
    expect(selectAccountServerOptions(storeWith(null).getState())).toEqual({
      hasOfficialServer: false,
      serverChoice: "own",
    });
  });

  it("chooses the official server by default when there is one", () => {
    expect(selectAccountServerOptions(storeWith(cloudUrl).getState())).toEqual({
      hasOfficialServer: true,
      serverChoice: "official",
    });
  });
});

describe("selectSignInForm", () => {
  it("tells that the chosen server's offer is unknown at first", () => {
    expect(selectSignInForm(storeWith(cloudUrl).getState()).serverOffer).toBe(
      "unknown",
    );
  });

  it("tells what the official server offers once it has answered", () => {
    const store = storeWith(cloudUrl);
    store.dispatch(
      actions.serverAuthInfoReceived(cloudUrl, {
        accounts: true,
        open_signup: false,
      }),
    );
    expect(selectSignInForm(store.getState()).serverOffer).toBe("signupClosed");
  });

  it("tells that the form is busy while the server is being asked", () => {
    const store = storeWith(cloudUrl);
    store.dispatch(
      actions.signInFormChanged({
        email: "someone@example.com",
        password: "correct horse",
      }),
    );
    store.dispatch(actions.signInSubmitted());
    expect(selectSignInForm(store.getState()).isBusy).toBe(true);
  });

  it("keeps its reference while nothing changes", () => {
    const store = storeWith(null);
    expect(selectSignInForm(store.getState())).toBe(
      selectSignInForm(store.getState()),
    );
  });
});

describe("selectCanSubmitSignIn", () => {
  it("holds back the official server's form until it is filled in", () => {
    expect(selectCanSubmitSignIn(storeWith(cloudUrl).getState())).toBe(false);
  });

  it("lets the official server's form be sent once it is filled in", () => {
    const store = storeWith(cloudUrl);
    store.dispatch(
      actions.signInFormChanged({
        email: "someone@example.com",
        password: "correct horse",
      }),
    );
    expect(selectCanSubmitSignIn(store.getState())).toBe(true);
  });
});

describe("selectPasswordStrength", () => {
  it("assesses nothing while the signup password is empty", () => {
    const store = storeWith(null);
    store.dispatch(actions.signInFormChanged({ mode: "signup" }));
    expect(selectPasswordStrength(store.getState())).toBeNull();
  });

  it("assesses nothing while the form logs in", () => {
    const store = storeWith(null);
    store.dispatch(actions.signInFormChanged({ password: "marigold" }));
    expect(selectPasswordStrength(store.getState())).toBeNull();
  });

  it("assesses the password typed while signing up", () => {
    const store = storeWith(null);
    store.dispatch(
      actions.signInFormChanged({ mode: "signup", password: "marigold" }),
    );
    expect(selectPasswordStrength(store.getState())?.level).toBe("weak");
  });

  it("keeps its reference while the password does not change", () => {
    const store = storeWith(null);
    store.dispatch(
      actions.signInFormChanged({ mode: "signup", password: "marigold" }),
    );
    expect(selectPasswordStrength(store.getState())).toBe(
      selectPasswordStrength(store.getState()),
    );
  });
});

describe("selectIsSigningOut", () => {
  it("tells that the app is logging out while the server has not answered", () => {
    const store = createAppStore(
      createRecordingEffects(),
      createFakeServerStoreParts({ serverUrl: cloudUrl, token: "t" }),
    );
    store.dispatch(actions.signOutRequested());
    expect(selectIsSigningOut(store.getState())).toBe(true);
  });
});
