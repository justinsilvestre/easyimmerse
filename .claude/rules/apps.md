---
paths:
  - "apps/**"
---

# Apps

An app composes packages and contains almost no logic of its own. It chooses an `Effects` implementation, resolves the server configuration, creates the store, and mounts `AppRoot`. Reducers, components, and API definitions belong in `packages/`, not here.
