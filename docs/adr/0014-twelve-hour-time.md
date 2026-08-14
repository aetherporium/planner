# ADR-0014 — The Ethiopian clock: the day begins at dawn

**Status:** Accepted (supersedes the midnight-anchored 12-hour reading)

## Context

The app read 6:00 as "6 in the morning". The user wakes at **12**. That is the
Ethiopian clock, and it is not a formatting preference — it is a different
zero. The day starts at dawn, so 06:00 international is hour zero, and the
count runs 12, 1, 2 … 11 through daylight, then 12, 1 … 11 again at night.

The bug this exposed: with the day anchored at midnight, a 22:30 sleep of 450
minutes ran to 1800 of 1440 and fell off the bottom of the canvas, which is why
the page was too long.

## Decision

**Reading.** `parts(min)` returns the Ethiopian hour and whether it is night.

| International | Reads | |
|---|---|---|
| 06:00 | 12:00 | day |
| 07:00 | 1:00 | day |
| 12:30 | 6:30 | day |
| 18:00 | 12:00 | night |
| 19:30 | 1:30 | night |
| 22:30 | 4:30 | night |
| 00:00 | 6:00 | night |

Day runs 06:00–17:59, night 18:00–05:59, shown by a hollow or filled mark —
never the letters am/pm.

**Geometry.** The timeline is anchored at `DAWN` too, not midnight. Positions
are `fromDawn(startMin)`, so the canvas runs wake → sleep in the order they are
lived, and sleep at 22:30 for 450 minutes ends at exactly 1440 — the last pixel
of the day rather than 360 past it.

**Storage never changes.** The domain layer still keeps minutes from midnight
and `fmtTime` still returns 24-hour; all 54 domain tests are untouched. This is
a reading, applied at the edge in `src/app/format.js`.

## Consequences

- `parseEth("1:30", night)` turns a typed Ethiopian time back into storage.
- The analog dial is an ordinary twelve-hour face with 12 at the top; the hour
  hand is offset six hours, which is exactly what the reading means.
- Defaults did not move. Wake was always 06:00; it now *reads* as 12, which is
  what the user was saying all along.
