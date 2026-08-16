# ADR-0027 — Tasks have kinds, because time is not the only measure

**Status:** Accepted

## Context

Every task was a block of time that was either done or not done. That is wrong
for most of the things worth tracking. Water is a target you fill across a day
and has no place on the clock at all. Sleep is a number measured afterwards.
A gym session is a list of sets, and "did you go" is a much poorer question
than "how much of it did you do".

## Decision

Four kinds, in `src/kinds.mjs`. A kind adds a way of MEASURING and a way of
LOGGING, and never touches scheduling — it is orthogonal to pattern, category
and clock.

- **Plain** — a block of time. Done or not.
- **Tally** — add up to a target across the day. Water: 2500 ml in 250 steps.
- **Measure** — one number recorded once. Sleep: 8 hr.
- **Checklist** — ordered items ticked off. Gym sets.

**The measurement lives on the entry, not the task.** The task says "2500 ml a
day"; the entry says "1400 ml today". Keeping them apart is what lets the same
task be judged differently on different days.

### Spread tasks are not moments

Water has `duration === 0`, exactly like Wake — but for the opposite reason.
Wake is an instant on the clock; water is smeared across the whole day. So
`isMoment` now consults the kind, and `timelineWithGaps` filters spread tasks
out entirely: they get their own band above the ruler rather than a hairline
at dawn that would be a lie.

### Pace, not nagging

A tally shows a tick where an even pace would put you by now. Being behind at
2pm is normal, so it is a mark, never a warning, and the copy says "no harm in
catching up later".

## Consequences

- `makeEntry` gains `amount` and `checked`.
- `setAmount` REPLACES rather than appends — a running total is not an event.
- Drink water ships as a sixth default; Sleep becomes a measure.
