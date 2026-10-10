# @easyimmerse/state

The app's state and the rules that change it, independent of any platform. It is a Redux store whose reducer is a pure update function that returns the next state together with the effects to perform; effects are plain data, performed by a middleware. The `ui` package and the apps consume it; the apps supply the platform's `Effects` implementation and the server store parts.

## What one action goes through

1. Each feature updates its own slice, seeing every slice and the server cache as they were before the action (`app/update.ts`, `app/feature.ts`).
2. The platform, screen and flashcard commands add effects without changing any state (`platform/platformCommands.ts`, `screen/screenCommands.ts`, `flashcards/flashcardCommands.ts`).
3. `trackOperations` records the requests sent and the jobs watched, holds back scoped and held requests, and returns the effects to perform (`operations/trackOperations.ts`).
4. The close guard starts guarding the app's closing when unsaved work begins, and stops once none is left (`app/closeGuard.ts`).
5. The middleware drains the effects the reducer queued and runs each through its runner, with the platform's `Effects`, the store's dispatch, the pending timers and the requests in flight (`app/effectsMiddleware.ts`, `app/runEffect.ts`).
6. A `dispatch` effect feeds an action back into the store once the update that returned it is done (`app/dispatchEffect.ts`).

The store is assembled in `app/createAppStore.ts`.

## Folders under `src/`

- `app/`: the store, the root update, the `Effect` union, the effect runner and the test helpers.
- `route/`: where the app is.
- `screen/`: the main screen, Settings and the open dialog, one subfolder per screen.
- `flashcards/`: the flashcard form and the saves it sends; keeps no slice of its own.
- `operations/`: requests in flight, failed requests kept, and server jobs polled.
- `server/`: the server config, the request types, the request table and the server cache.
- `platform/`: the `Effects` interface, its recording fake, and the platform commands.
- `preferences/`: the stored preferences, the theme and the appearance they call for.
- `storedPlaces/`: where to resume each book and media file.
- `notices/`: the notices shown and their expiry.
- `timers/`: the timer table and the clock it waits through.
- `keys/`: what each key does on each screen.

## Testing

Updates are pure, so most tests call one and check the state and effects it returns. `stateAfter` in `app/stateAfter.ts` builds a state through real actions, following the dispatches an update returns. `createRecordingEffects` in `platform/recordingEffects.ts` stands in for the platform and records every call; `createFakeServerStoreParts` in `app/createFakeServerStoreParts.ts` stands in for the server and settles requests when a test says so. Together with `createAppStore` they run the whole pipeline in a test.

```sh
mise exec -- pnpm --filter @easyimmerse/state test
```
