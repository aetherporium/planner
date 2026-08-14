# ADR-0020 — Yesterday, today and tomorrow are one timeline

**Status:** Accepted (replaces the adjacency rails)

## Context

Neighbouring days were rails bolted above and below the scroller. They read as
two separate widgets stapled to a third, and moving between days replaced the
screen outright — a jarring jump for what is really a continuous thing.

## Decision

One scroller holds three day sections separated by a 46px divider. The current
day is at full strength; the neighbours sit at 42% opacity, present but clearly
not the subject.

- Scrolling past ~62% into tomorrow (or ~38% back into yesterday) makes that
  day the current one, so the day changes by *moving through it*.
- The divider is also a link, for people who would rather click.
- Changing day animates: the timeline rises 10px and fades in over 260ms.
- The scroller is `overflow-x: hidden`. A day timeline has no horizontal
  dimension; any sideways scroll was a bug.

The next-day divider uses a real downward arrow glyph, not an up arrow rotated
in CSS.

## Consequences

- `Adjacent` and the `.adj` rails are deleted.
- The timeline takes `timelineFor` rather than a single `timeline`, since it now
  renders three days.
