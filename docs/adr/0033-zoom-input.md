# ADR-0033 — Zoom is an input, not a pair of buttons

**Status:** Accepted (amends ADR-0032)

## Context

Zoom existed only as `+` and `−` buttons at the top of the timeline. Every
other zoomable canvas — maps, editors, image viewers — is driven by the wheel
and the keyboard, and the buttons are the fallback. Ours had the fallback and
nothing else.

The readout also named gridline spacing ("30 min") as if that were the zoom
level. It is a consequence of the zoom, not the zoom.

## Decision

- **Ctrl/⌘ + wheel** zooms. A trackpad pinch arrives as exactly this, so pinch
  works for free. A plain wheel still scrolls — zoom must never steal that.
- **Ctrl/⌘ + `+` / `−`** zooms, **Ctrl/⌘ + `0`** returns to 100%.
- **Anchored on the pointer.** The instant under the cursor stays put;
  otherwise scaling throws you elsewhere in the day.
- **Percentages.** 100% is the readable default and the readout says `100%`,
  with the gridline spacing beneath it in small text as the consequence it is.
  Clicking the readout resets.
- **Bottom right**, dimmed to 55% until the timeline is hovered. It is a
  status readout you occasionally poke, not a headline.

Listeners are bound to the scroller, never to `window` — the browser's own
page zoom stays available everywhere else. This follows ADR-0030: the app
takes keys only from the thing you are pointing at.

## Consequences

- `zoom` stays a continuous number in settings; nothing snaps to stops.
