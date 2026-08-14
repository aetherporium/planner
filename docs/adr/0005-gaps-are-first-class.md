# ADR-0005 — Gaps are planned: rest, travel and the space between

**Status:** Accepted

## Context

From the brief: "we plan every little detail, meaning the blank spaces or rest we
consider, could be default rest, or like traveling — I can't just clean my house and
just buy an item from a store without traveling."

## Decision

`timelineWithGaps()` returns a continuous timeline, not a task list. Every minute
between `dayStart` and `dayEnd` is one of:

- **task** — a scheduled item
- **gap/rest** — unclaimed time. The default, and legitimate.
- **gap/travel** — a gap between two tasks whose `place` differs. Auto-detected.
- **overlap** — two tasks claiming the same minutes. Surfaced, never hidden.

Travel is inferred rather than typed: give tasks a `place` and the transitions
appear on their own. That is what makes "clean house → buy item" show its missing
travel time instead of silently overrunning the day.

## Consequences

- A day that looks fine as a list can be visibly impossible as a timeline.
- `place` is optional; without it gaps are plain rest, and nothing breaks.
- Travel duration is currently just the gap size — the app doesn't estimate real
  journey time. A future version could take a distance matrix.
