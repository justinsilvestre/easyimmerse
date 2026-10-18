import type { PluginForm } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  formShown,
  openedPluginForm,
  type PluginFormWizard,
  requestFailed,
  stepSent,
} from "./pluginFormWizard.ts";

const subtitlesForm: PluginForm = {
  title: "Subtitles",
  description: null,
  fields: [],
  actions: [{ id: "add", label: "Add", style: "primary" }],
};

const showing: PluginFormWizard = {
  form: subtitlesForm,
  isAwaitingAnswer: false,
  error: "The last action failed.",
};
const awaiting: PluginFormWizard = {
  ...showing,
  isAwaitingAnswer: true,
  error: null,
};

describe("stepSent", () => {
  it("awaits an answer and clears the last failure", () => {
    expect(stepSent(showing)).toEqual(awaiting);
  });
});

describe("formShown", () => {
  it("shows the form and stops awaiting an answer", () => {
    const next = { ...subtitlesForm, title: "Next" };
    expect(formShown(awaiting, next)).toEqual({
      ...awaiting,
      form: next,
      isAwaitingAnswer: false,
    });
  });

  it("clears the last failure", () => {
    expect(formShown(showing, subtitlesForm).error).toBeNull();
  });
});

describe("requestFailed", () => {
  it("shows the failure's message", () => {
    const failed = requestFailed(
      awaiting,
      { status: 500, message: "no such video" },
      "fallback",
    );
    expect(failed.error).toBe("no such video");
  });

  it("shows the fallback when the failure carries no message", () => {
    const failed = requestFailed(
      awaiting,
      { status: 500, message: "" },
      "fallback",
    );
    expect(failed.error).toBe("fallback");
  });

  it("stops awaiting an answer", () => {
    const failed = requestFailed(
      awaiting,
      { status: 500, message: "" },
      "fallback",
    );
    expect(failed.isAwaitingAnswer).toBe(false);
  });
});

describe("openedPluginForm", () => {
  it("shows no form until one arrives", () => {
    expect(openedPluginForm.form).toBeNull();
  });
});
