# ADR-0028 — Conflicts are shown, not refused

**Status:** Accepted

## Context

Two tasks at the same time is usually a mistake, and the app said nothing until
after you had saved. The obvious fix — refuse to save — is worse: a call during
a commute is a genuine overlap, and a disabled button with no explanation is
the least useful thing an interface can do.

## Decision

`conflictsFor` reports findings, not a verdict. While you type, the Add form
draws the collision: your proposed block against what is already there, both to
scale, with the overlap in minutes.

Two kinds of finding:

- **overlap** — the spans intersect.
- **tight** — back-to-back in *different places*, with under 15 minutes to get
  between them. Time that does not exist is still a conflict.

Moments never clash: an instant fits anywhere. Spread tasks never clash: they
are not on the ruler.

**You can always still save.** Alongside the drawing, `nextFreeSlot` offers the
nearest gap that actually fits, as one click.

## Consequences

- Editing a task passes `ignoreId` so it does not collide with itself.
- The same functions can later drive automatic distribution of a weekly goal
  into free slots, which is the natural next use.
