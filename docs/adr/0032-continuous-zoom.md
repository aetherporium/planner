# ADR-0032 — Zoom is continuous, and scrolling between days is free

**Status:** Accepted (amends ADR-0020)

## Context

Two mistakes in the previous timeline.

**Named zoom stops** — Day, Wide, Normal, Close, Detail — meant the finest view
was fixed at 15 minutes by a decision made in the abstract. If you want to see
where two things collide by seconds, a named stop cannot give it to you.

**Gated day changes.** Crossing into a neighbour armed a "Go to Saturday" bar
you had to click. It was built to prevent accidental drift, but it made the
ordinary act of scrolling through time into a decision, which is worse than
the problem it solved.

## Decision

**Zoom is continuous**, ×1.6 per press, from 0.4 to 120. The gridline interval
is derived from the scale — the finest spacing that still leaves 46px between
lines — so labels follow the scale instead of the scale following the labels.
At full zoom that is a line every **30 seconds**. The control shows the actual
spacing ("30 min", "30 sec"), never an invented name.

**Scrolling between days is free.** All three days are one strip and you move
through all of it. What the scroll position changes is the *label*: whichever
day fills the viewport is the one the header names. The URL only changes when
you settle, so Back still works.

The ruler is **windowed** — only lines within the viewport (plus a margin) are
built. At 30-second resolution three days would otherwise be 8640 nodes.

## Consequences

- `Timeline` takes `onVisibleDay`; `DayPage` renames its header from it.
- The armed-jump bar and its CSS are deleted.
