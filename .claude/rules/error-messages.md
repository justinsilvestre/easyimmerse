---
paths:
  - "packages/ui/**"
---

# Error messages

A message about something that failed speaks to a person in plain words, in the spirit of the Elm compiler's error messages. Each one says:

- what didn't happen, naming the thing it concerns ("“Im Park” couldn't be added to the project"), never a vague "the item" or "the operation";
- why, when the cause is known, in plain words;
- what the person can do next, such as unpublishing first, checking the connection, or trying again in a moment.

Keep the tone friendly and calm. Do not show codes, status numbers, stack traces, or internal names, and do not blame the person. Use everyday words: "couldn't be saved", not "request failed" or "invalid state". When the server's own message is too technical to show as it is, put it under a "What the server reported" disclosure below the plain message.

A message must be true in every case where it can appear. When the cause is unknown, say only what didn't happen and what to try next.
