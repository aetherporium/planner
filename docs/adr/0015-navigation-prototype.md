# ADR-0015 — Navigation prototype (open question)

**Status:** Superseded by ADR-0018

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


## Outcome

**C — Orbit won**, and is now the app's navigation (`src/app/Nav.jsx`).

The deciding problem was that the app had *no* reachable navigation at all: the
day page had no way to get to the calendar or blueprints, so most of the app
was unreachable. A always demanded a gesture the user could not discover, and B
hid every destination behind knowing its name. C is the only one of the three
that answers "what is in this app?" without being told.

Changes made when promoting it:

- Spokes are `<a href>`, not buttons, so back and forward keep working.
- The current page's spoke is marked, so the anchor doubles as a "you are here".
- Closed spokes leave the tab order; Escape and any hash change close it.

A and B remain browsable at `#/prototype/<A|B|C>`, linked from the blueprints
page, and `src/app/prototype-nav.jsx` stays throwaway until the user is done
comparing.


## Final outcome

Superseded. The user chose **B (Summon)** for reach and **A (Adjacency)** for
zero-cost neighbours, and asked for B to gain a calendar and free-form date
parsing. C (Orbit) was dropped. See ADR-0018; the prototype file is deleted.
