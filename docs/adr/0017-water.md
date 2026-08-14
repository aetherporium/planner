# ADR-0017 — Time already spent reads as water

**Status:** Accepted (replaces the progress spine)

## Context

Elapsed time was a solid bar filling a 2px spine on the left edge. It was
legible but inert, and any attempt to widen it covered the entries.

## Decision

Elapsed time is drawn as **water rising behind the whole day**: a soft vertical
tint from 4% to 11% accent, capped by a moving surface line that drifts
sideways on a nine-second loop.

The rule that makes it work: **it must never block what it covers.** The water
sits at `z-index: 0` behind the entry layer, is `pointer-events: none` and
`aria-hidden`, and tints rather than masks — every entry under it stays fully
legible and fully clickable. It is a level, not a curtain.

It only appears on today. A future day has no elapsed time, and filling a past
day would falsely imply everything in it happened.

## Consequences

- The old `.tl-fill`, `.tl-spine` and `.tl-nowdot` are gone; the water's surface
  is itself the now-marker.
- A test asserts the water contains no interactive elements and does not wrap
  the entry layer.
