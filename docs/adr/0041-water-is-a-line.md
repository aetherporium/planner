# 0041 — Water is a line, and it is placed on purpose

Status: Accepted
Date: 2026-08-17
Amends: 0028-adjacent work on planned tallies

## Context

Two faults, reported together as "the water thing has issue".

**It was in the wrong place.** `timelineFor` shifts each task's `startMin` onto
the dawn axis with `fromDawn`, but it never shifted `task.slots`. The slots were
then read as though already dawn-relative, so every sip was displaced by the
six-hour dawn offset. Measured: a slot planned for 6:30 rendered at 12:30, and
the last one — planned for 20:00 — landed at 02:00, in the middle of sleep. The
app was telling the user to drink while asleep.

**It was the wrong shape.** Each slot drew as a `.sip` pill with a background,
a border and an 18px dot, absolutely positioned over the ruler at `z-index: 3`.
A sip takes no time, but the pill occupied space and covered whatever task it
happened during.

## Decision

**Fix the axis.** `timelineFor` maps `slots` through `fromDawn` alongside
`startMin`. Slot times are clock times like every other time in the store.

**Draw a line.** A slot is a hairline dashed rule spanning the ruler at its own
minute, with a small tag parked at the right edge showing the amount. It crosses
the task it occurs during instead of covering it, and it claims no height —
14px total, `translateY(-50%)`, consistent with a moment being an instant rather
than a block.

State reads through the line rather than through a filled shape: due is solid
rather than dashed, done goes accent-coloured and recedes.

**Place the slots deliberately.** The old set was a blind two-hour rhythm from
06:30. The new set is anchored to the day's other fixed points: on waking, after
breakfast, mid-morning, *before* lunch rather than during it, mid-afternoon,
before dinner, and a last one at 20:30 — two hours before a 22:30 sleep. No slot
falls inside a meal and none falls in the night.

## Consequences

This is placement by hand, which is what was asked for now. The real answer is
distribution: given a target and the free space in a day, the app should place
the slots itself and move them when the day changes. `conflictsFor` and
`nextFreeSlot` already exist for it. That remains open.

Tests assert the invariants rather than the literal times: every slot between
waking and sleep, no slot inside a meal, and each rendered sip labelled with the
clock time it was planned for.
