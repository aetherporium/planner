# ADR-0002 — "Branching views" has three readings; the prototype decides

**Status:** Proposed — awaiting the user's pick

## Context

The brief asked for "multiple view, branching views, and pages". **Branching** is
load-bearing and ambiguous. Three readings are all consistent with the words:

1. **Hierarchy** — Tasks branch into sub-Tasks. An outline that nests. "Branching"
   describes the *shape of the data*.
2. **Scenarios** — a plan branches into alternative versions you compare and merge,
   like git. "Branching" describes *versions of the plan*.
3. **Dependency graph** — Tasks branch into parallel paths that later rejoin.
   "Branching" describes *sequence and parallelism*.

These are not variations on a theme. They imply different data models, different
primary affordances, and different products.

## Decision

Do not guess, and do not block. Build **one variant per reading** and let the pick be
made by clicking. This is the stated purpose of the `/prototype` UI branch: "the user
would otherwise spend a day picking between three vague mockups in their head."

| Variant | Reading | Primary affordance |
|---|---|---|
| **A — Outline** | Hierarchy | Keyboard-driven nesting, infinite depth |
| **B — Scenarios** | Versions | Branch switcher, fork/compare a plan |
| **C — Flow** | Dependencies | Spatial canvas, parallel lanes rejoining |

Per `UI.md`, variants must be **structurally different** — "three slightly-tweaked
card grids isn't a UI prototype, it's wallpaper." These differ in layout, information
hierarchy, and primary affordance.

## Consequences

- The expected feedback is not "B is best" but **"the branch switcher from B with the
  nesting from A"** — `UI.md` calls that out as the usual and most useful outcome.
- All three share one **pure store module** with no DOM, so whichever wins lifts into
  `src/` mechanically.
- Sub-shape **B** (a throwaway route) was used rather than the preferred sub-shape A,
  because greenfield has no existing page to host variants. Noted as a known
  weakness: "an empty route hides design problems that a populated one would expose."
  The prototype ships with realistic seeded data to compensate.
