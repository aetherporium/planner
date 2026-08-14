# ADR-0015 — Navigation prototype (open question)

**Status:** Proposed — awaiting the user's pick

## Context

Directory-style navigation (breadcrumbs plus a footer of links) was rejected:
it makes a scheduler feel like a file browser, and it puts the machinery of
getting around on top of the thing you came to look at.

## Decision

Built as a `/prototype` per the skill: three **structurally different**
variants on `#/prototype/<A|B|C>`, mounted around the real day page with real
tasks, switchable from a floating bottom bar (arrow keys work too). The bar is
deliberately high-contrast so it reads as scaffolding, not design.

- **A — Adjacency.** No navigation UI at all. Neighbouring days are literally
  adjacent, scrolled into from above and below. Nothing to learn and nothing on
  screen; everything non-adjacent is more than one gesture away.
- **B — Summon.** Navigation has no permanent home. `/` or one thumb press
  raises a field that goes anywhere by name — a day, a task, a pattern, a
  category. Fastest for anyone who knows what they want; invisible to anyone
  who does not.
- **C — Orbit.** One anchor at the thumb, always in the same place. Pressing it
  fans three destinations onto fixed arcs, so their positions become muscle
  memory. Costs one permanent dot of furniture.

## Consequences

- `src/app/prototype-nav.jsx` is throwaway and marked as such on screen. Once a
  variant wins it gets rewritten properly into the app and the file, its CSS
  block, and the `#/prototype` route are deleted.
- Until then the app keeps the plain top bar: back on the left, theme on the
  right.
