import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import {
  selectDeletionToConfirm,
  selectNewUserForm,
  selectUserChangeFailureMessage,
  selectUserChangeInFlight,
} from "./userManagementSelectors.ts";

const newUser = {
  email: "someone@example.com",
  password: "correct horse",
  role: "privileged",
} as const;

const createdUser = {
  id: "u2",
  ...newUser,
  created_at_ms: 0,
  email_confirmed_at_ms: null,
};

const lastAdministrator = {
  ok: false,
  error: { status: 409, code: "last_administrator", message: "" },
} as const;

/** A store connected to a server, whose requests wait until the test answers them. */
function connectedStore(bundledIn?: "desktop") {
  const server = createFakeServerStoreParts({
    serverUrl: "https://books.example.org",
    token: "t",
    ...(bundledIn && { bundledIn }),
  });
  const store = createAppStore(createRecordingEffects(), server);
  return { server, store };
}

/** A store whose new-account form is filled in and sent. */
function creatingStore() {
  const connected = connectedStore();
  connected.store.dispatch(actions.newUserFormChanged(newUser));
  connected.store.dispatch(actions.newUserSubmitted());
  return connected;
}

const createRequest = {
  kind: "createUser",
  via: "self",
  request: newUser,
} as const;

describe("updateUserManagement", () => {
  describe("when an account is created", () => {
    it("sends the form's email, password and role", () => {
      const { server } = creatingStore();
      expect(server.sentRequests).toContainEqual(createRequest);
    });

    it("shows that the account is being created", () => {
      const { store } = creatingStore();
      expect(selectNewUserForm(store.getState()).isCreating).toBe(true);
    });

    it("empties the form once the server has created it", async () => {
      const { server, store } = creatingStore();
      server.respond(createRequest, { ok: true, data: createdUser });
      await vi.waitFor(() =>
        expect(selectNewUserForm(store.getState()).email).toBe(""),
      );
    });

    it("tells why the server refused it", async () => {
      const { server, store } = creatingStore();
      server.respond(createRequest, {
        ok: false,
        error: { status: 409, code: "email_taken", message: "" },
      });
      await vi.waitFor(() =>
        expect(selectNewUserForm(store.getState()).failureMessage).toBe(
          "An account with this email address already exists.",
        ),
      );
    });
  });

  it("sends nothing for a form without a password", () => {
    const { server, store } = connectedStore();
    store.dispatch(
      actions.newUserFormChanged({ email: "someone@example.com" }),
    );
    store.dispatch(actions.newUserSubmitted());
    expect(server.sentRequests).toEqual([]);
  });

  it("sends the role chosen for an account", () => {
    const { server, store } = connectedStore();
    store.dispatch(actions.userRoleChosen("u1", "administrator"));
    expect(server.sentRequests).toContainEqual({
      kind: "setUserRole",
      via: "self",
      userId: "u1",
      role: "administrator",
    });
  });

  it("sends the role chosen through the built-in server to the remote it is linked to", () => {
    const { server, store } = connectedStore("desktop");
    store.dispatch(actions.userRoleChosen("u1", "administrator"));
    expect(server.sentRequests).toContainEqual({
      kind: "setUserRole",
      via: "linkedRemote",
      userId: "u1",
      role: "administrator",
    });
  });

  it("tells that the only administrator's role cannot change", async () => {
    const { server, store } = connectedStore();
    store.dispatch(actions.userRoleChosen("u1", "library_user"));
    server.respond(
      {
        kind: "setUserRole",
        via: "self",
        userId: "u1",
        role: "library_user",
      },
      lastAdministrator,
    );
    await vi.waitFor(() =>
      expect(selectUserChangeFailureMessage(store.getState())).toBe(
        "You can't change the role of the server's only administrator. Make another account an administrator first.",
      ),
    );
  });

  describe("when an account's deletion is asked for", () => {
    it("waits for it to be confirmed", () => {
      const { store } = connectedStore();
      store.dispatch(actions.userDeletionAsked("u1"));
      expect(selectDeletionToConfirm(store.getState())).toBe("u1");
    });

    it("sends nothing before it is confirmed", () => {
      const { server, store } = connectedStore();
      store.dispatch(actions.userDeletionAsked("u1"));
      expect(server.sentRequests).toEqual([]);
    });

    it("keeps the account when it is cancelled", () => {
      const { store } = connectedStore();
      store.dispatch(actions.userDeletionAsked("u1"));
      store.dispatch(actions.userDeletionCancelled());
      expect(selectDeletionToConfirm(store.getState())).toBeNull();
    });

    it("deletes the account once it is confirmed", () => {
      const { server, store } = connectedStore();
      store.dispatch(actions.userDeletionAsked("u1"));
      store.dispatch(actions.userDeletionConfirmed());
      expect(server.sentRequests).toContainEqual({
        kind: "deleteUser",
        via: "self",
        userId: "u1",
      });
    });

    it("shows that the account is being deleted", () => {
      const { store } = connectedStore();
      store.dispatch(actions.userDeletionAsked("u1"));
      store.dispatch(actions.userDeletionConfirmed());
      expect(selectUserChangeInFlight(store.getState(), "u1")).toBe(
        "deleteUser",
      );
    });
  });
});
