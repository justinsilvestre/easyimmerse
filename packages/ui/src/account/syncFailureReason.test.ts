import { describe, expect, it } from "vitest";
import { syncFailureReason } from "./syncFailureReason.ts";

const reasonFor = (code: string) =>
  syncFailureReason(code, "cloud.example.org", "this computer", false);

describe("syncFailureReason", () => {
  it("suggests updating the app or an own server when the two don't work together", () => {
    expect(reasonFor("remote_protocol")).toBe(
      "This version of the app doesn't work with cloud.example.org. Updating the app or the server may fix this.",
    );
  });

  it("suggests updating only the app when it doesn't work with the easyImmerse cloud", () => {
    expect(
      syncFailureReason(
        "remote_protocol",
        "the easyImmerse cloud",
        "this computer",
        true,
      ),
    ).toBe(
      "This version of the app doesn't work with the easyImmerse cloud. Updating the app may fix this.",
    );
  });

  it("blames the server for its own internal error", () => {
    expect(reasonFor("internal")).toBe(
      "Something went wrong on cloud.example.org. Trying again later may help.",
    );
  });

  it("tells when the app could not read its own data on the device", () => {
    expect(reasonFor("storage")).toBe(
      "easyImmerse couldn't read its own data on this computer.",
    );
  });

  it("tells when a media file on the device could not be read", () => {
    expect(reasonFor("local_file")).toBe(
      "A media file on this computer couldn't be read.",
    );
  });

  it("tells that the server refused, for any other code", () => {
    expect(reasonFor("payload_too_large")).toBe(
      "The backup was refused by cloud.example.org.",
    );
  });
});
