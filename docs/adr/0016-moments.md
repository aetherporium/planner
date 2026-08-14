# ADR-0016 — A task with no duration is a moment

**Status:** Accepted

## Context

Wake was given a five-minute duration so it would have a block to draw. Waking
does not take five minutes — it is the instant the day starts. The invented
duration was fabricated data, and it produced a block that claimed a stretch of
the day nothing was spent on.

## Decision

`duration: 0` means **moment**, and `isMoment(task)` is the test.

In the timeline model a moment:

- is emitted as its own `kind: "moment"` with `startMin === endMin`,
- does not move the cursor, so it never consumes time,
- never opens a gap behind itself,
- is skipped when looking back for a place change, so it cannot invent travel,
- counts as *current* only on its exact minute.

On screen it is a hairline with a dot and a label, not a block. On a blueprint
it shows a point instead of a duration bar, and reads "moment" rather than
"0 min".

## Consequences

- Wake is the first default moment. Alarms, deadlines and reminders are the
  same shape.
- The five-minute lie is gone from the day, so the first real block is
  breakfast and the rest gap runs from dawn.
