# ADR-0031 — Water is planned, not floated

**Status:** Accepted (amends ADR-0027)

## Context

The first pass made hydration a tally that lived in a band above the timeline,
deliberately kept off the ruler. That was wrong: it turned water into a total
you remember at 11pm, and it sat apart from every other task instead of among
them.

Water is not unplaceable. It is *placed* — you drink on waking, mid-morning,
with lunch. The plan is the point.

## Decision

A planned tally carries **slots**: real times through the day, each worth a
share of the target. Water ships with eight slots from 6:30 to 20:00 at 310 ml,
the last early enough not to wake you.

`timelineWithGaps` expands slots into `kind: "slot"` items **after** the cursor
walk, so they ride on top of the day: no height, no gap, no cursor movement. A
sip does not interrupt a lesson.

On the ruler each slot is a small mark, tappable to record it, ticked when
taken and highlighted when due. The task page still shows the whole: total,
target, and the even-pace mark.

## Consequences

- `isSpreadTask` still keeps the parent task off the ruler; the slots stand in
  for it.
- The floating `.spread-band` is deleted.
- Any tally can be planned this way — steps, medication, study blocks.
