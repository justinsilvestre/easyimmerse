---
paths:
  - "packages/**"
  - "apps/web/**"
  - "apps/extension/**"
  - "apps/native/src/**"
---

# TypeScript packages

- Packages are consumed from source: `main` points at `src/index.ts` and there is no build step.
- Package names carry the `@easyimmerse/` scope; directory names omit it.
- Unit tests sit next to the code as `<name>.test.ts`; type-level tests as `<name>.test-d.ts`.
- `describe` names the unit under test and `it` continues the sentence, for example `describe("update")` + `it("returns a seekPlayer effect for seekRequested")`.
- One expectation per test. Build state through the exported factories (`createAppStore`, `createRecordingEffects`) rather than shared fixtures.
- Types generated from Rust come only from `@easyimmerse/types`. Do not hand-write a type that Rust already defines.
- Tailwind classes live only in components under `packages/ui`. Apps compose screens and add no styling of their own.
