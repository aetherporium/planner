# 0040 — A day ends where the day ends

Status: Accepted
Date: 2026-08-17
Revokes: the scroll-into-neighbours half of 0020

## Context

ADR-0020 put yesterday, today and tomorrow in one scroller so that moving
between days was a scroll rather than a page load. In use that means the day
has no bottom: keep scrolling and you are silently in tomorrow. Combined with
0039 — where the page itself is now the scroller — drifting across a day
boundary while reading the evening is far too easy, and the day you are looking
at stops being a fact you can rely on.

## Decision

**The scroller holds one day.** `.tl-day.neighbour` no longer exists; there is
exactly one `.tl-day`, and the track is one day tall.

**Crossing a day is deliberate.** A `Divider` sits at each end, outside the
scrolling area: up for yesterday, down for tomorrow, each a real link to
`#/day/<jdn>`. The date box and the calendar remain the other ways across.

The direction convention from earlier rounds is unchanged: next points down,
previous points up.

## Consequences

`onVisibleDay` and the visible-day tracking are gone — the day being shown is
the day in the route, always, so the header cannot disagree with the URL.

The scroll-position effect still exists, but only to decide which slice of
ruler to draw; it no longer decides which day you are on.

This does not revive "a go-to button is the only way to change day", which was
rejected and stays rejected: scrolling still moves you freely *within* a day,
and the arrows sit inline at the two ends where the movement naturally
continues, rather than in a toolbar.
