# ADR-0012 — The day is 24 hours tall, and height is duration

**Status:** Accepted

## Context

A list of task rows makes a 5-minute task and a 7-hour sleep the same size.
That is a lie about the shape of a day, and it hides the thing the brief cares
most about: the space between tasks.

## Decision

The day renders as a scrollable 24-hour canvas at a fixed 1.15 px per minute.

- An entry's **height is its duration**. Lunch (45m) is visibly one and a half
  times breakfast (30m); sleep (450m) is a long block you scroll past.
- Entries under ~34px lose their subtitle rather than shrink their type, and
  never drop below 16px so they stay clickable.
- **Gaps are drawn at their real height too.** Rest is a dashed outline, travel
  is gold and names both places, overlap is red. Gaps under 20 minutes are
  suppressed as noise.
- A **spine** runs down the left edge and fills from 00:00 to the current
  minute, advancing every second. It only appears on today — a future day has
  no elapsed time, and drawing a full bar on a past day would imply completion.
- The view scrolls to the current hour on load, once.

## Consequences

- The 5-hour hole between breakfast and lunch is now the largest thing on an
  empty user's screen, which is the honest picture and an invitation to plan.
- Vertical space is finite, so the timeline gets a fixed 460px window and
  scrolls internally rather than pushing the page to 1656px.
