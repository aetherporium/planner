# 0039 — The day is one page, and the page is the scroller

Status: Accepted
Date: 2026-08-17
Amends: 0020 (one timeline)

## Context

The day page had two scrollers on one screen. The header — clock, date, the
strip of nearby tasks — was fixed above a `.tl-scroll` box with
`overflow-y: auto` and an explicit pixel height, and the timeline scrolled
*inside* it. Reading further into the day never moved the page; it moved a
frame within the page, under a header that never went away.

That is a broken-feeling page. Nested scrollers fight the wheel, the scrollbar
belongs to something other than the document, and a large fixed header eats the
screen on exactly the axis the content needs.

## Decision

**One scroller: the page.** `.tl-scroll` keeps no height and no `overflow`. The
timeline lays out at its true height — 1440 minutes × the zoom scale — and the
window scrolls it. The header is ordinary content at the top of the page and
scrolls away like any heading.

**A rail takes its place.** Once the header has actually left the viewport
(measured with `getBoundingClientRect().bottom < 8`, not guessed at a fixed
offset, because the header's height changes with the viewport), a sticky bar
fades in carrying only:

* the digital time, and the day/night mark — no dial;
* the date, still clickable, still opening the calendar;
* the task in progress and the next two.

It is a summary, not the header again.

**Anchoring and zoom follow the page.** Opening the day scrolls the *window* to
the task in progress. Ctrl+wheel zoom keeps the minute under the pointer fixed
by measuring against the viewport (`into = (anchorY − box.top) / current`) and
re-scrolling the window, rather than setting `scrollTop` on an inner box.

## Consequences

The clock is no longer permanently on screen, which was the point: it is the
top of the day, not a fixture. What survives the scroll is the minimum you
actually need — the time, and what you are doing.

`.tl-fade` top and bottom are gone; they masked the edges of an inner scroller
that no longer exists.
