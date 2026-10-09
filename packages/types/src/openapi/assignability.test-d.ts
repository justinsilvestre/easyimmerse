import { describe, expectTypeOf, it } from "vitest";
import type * as generated from "../generated";
import type { components } from "./schema";

/**
 * Two generators read the same Rust types: ts-rs for the frontend and utoipa for the
 * OpenAPI document. They are known to disagree in small ways, for example ts-rs emits an
 * `Option<T>` field as `T | null` while utoipa also marks it as not required. Each test
 * asserts that a value of the ts-rs type is accepted where the OpenAPI schema expects
 * one, which is the direction a client constructing or reading values needs. A failure
 * here means the two generators have drifted apart on a type that crosses HTTP.
 */
type Schemas = components["schemas"];

describe("ts-rs output", () => {
  it("HealthResponse is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.HealthResponse>().toExtend<
      Schemas["HealthResponse"]
    >();
  });
  it("ApiError is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ApiError>().toExtend<Schemas["ApiError"]>();
  });
  it("ListProjectsResponse is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ListProjectsResponse>().toExtend<
      Schemas["ListProjectsResponse"]
    >();
  });
  it("Project is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.Project>().toExtend<Schemas["Project"]>();
  });
  it("ProjectSettings is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ProjectSettings>().toExtend<
      Schemas["ProjectSettings"]
    >();
  });
  it("Flashcard is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.Flashcard>().toExtend<Schemas["Flashcard"]>();
  });
  it("FlashcardDraft is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.FlashcardDraft>().toExtend<
      Schemas["FlashcardDraft"]
    >();
  });
  it("SubtitleTracksResponse is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.SubtitleTracksResponse>().toExtend<
      Schemas["SubtitleTracksResponse"]
    >();
  });
  it("AddSubtitleTrackRequest is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.AddSubtitleTrackRequest>().toExtend<
      Schemas["AddSubtitleTrackRequest"]
    >();
  });
  it("PreferenceValue is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.PreferenceValue>().toExtend<
      Schemas["PreferenceValue"]
    >();
  });
  it("TextSource is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.TextSource>().toExtend<Schemas["TextSource"]>();
  });
  it("ParseTimedTextRequest is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ParseTimedTextRequest>().toExtend<
      Schemas["ParseTimedTextRequest"]
    >();
  });
  it("TimedTextTrack is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.TimedTextTrack>().toExtend<
      Schemas["TimedTextTrack"]
    >();
  });
  it("Cue is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.Cue>().toExtend<Schemas["Cue"]>();
  });
  it("Document is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.Document>().toExtend<Schemas["Document"]>();
  });
  it("ParseLocalDocumentRequest is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ParseLocalDocumentRequest>().toExtend<
      Schemas["ParseLocalDocumentRequest"]
    >();
  });
  it("DictionarySummary is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.DictionarySummary>().toExtend<
      Schemas["DictionarySummary"]
    >();
  });
  it("ImportLocalDictionaryRequest is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ImportLocalDictionaryRequest>().toExtend<
      Schemas["ImportLocalDictionaryRequest"]
    >();
  });
  it("ListDictionariesResponse is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ListDictionariesResponse>().toExtend<
      Schemas["ListDictionariesResponse"]
    >();
  });
  it("LookupResponse is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.LookupResponse>().toExtend<
      Schemas["LookupResponse"]
    >();
  });
  it("TermEntry is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.TermEntry>().toExtend<Schemas["TermEntry"]>();
  });
  it("ListPluginsResponse is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ListPluginsResponse>().toExtend<
      Schemas["ListPluginsResponse"]
    >();
  });
  it("PluginForm is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.PluginForm>().toExtend<Schemas["PluginForm"]>();
  });
  it("ImportStepRequest is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ImportStepRequest>().toExtend<
      Schemas["ImportStepRequest"]
    >();
  });
  it("ImportStepResponse is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.ImportStepResponse>().toExtend<
      Schemas["ImportStepResponse"]
    >();
  });
  it("SourceStepRequest is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.SourceStepRequest>().toExtend<
      Schemas["SourceStepRequest"]
    >();
  });
  it("SourceStepResponse is assignable to its OpenAPI schema", () => {
    expectTypeOf<generated.SourceStepResponse>().toExtend<
      Schemas["SourceStepResponse"]
    >();
  });
});
