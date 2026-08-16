# ADR-0035 — Fixed date box, one scrollbar

**Status:** Accepted

## Context

Two small things that both read as the interface being unstable.

**The date box resized with its contents.** "Wednesday" is three characters
longer than "Friday", so the clock and the now-strip beside it shifted
sideways from one day to the next — the layout appeared to twitch once a day
for no reason a user could see.

**Scrollbars were the platform's.** Three different renderings across
browsers, none matching the app, and the page content jumped sideways whenever
one appeared.

## Decision

- `.dh-text` is a fixed `15ch`, cut for the longest day name and the widest
  Ethiopian month, with reserved heights on its lines so a holiday does not
  shove the clock either.
- One scrollbar rule for the whole app: 10px, thumb drawn inset via a
  transparent border and `background-clip: content-box`, so it reads thin but
  is comfortable to grab. `scrollbar-gutter: stable` on `html` keeps the page
  from jumping when it appears.

## Consequences

- Any fixed-width box is a truncation risk; `15ch` was measured against the
  longest real content, not guessed.
